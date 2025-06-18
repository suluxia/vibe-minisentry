package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"minisentry/internal/config"
	"minisentry/internal/database"
	"minisentry/internal/handlers"
	"minisentry/internal/middleware"
	"minisentry/internal/services"

	"github.com/go-chi/chi/v5"
)

func main() {
	cfg := config.Load()
	
	// Connect to database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()
	
	// Initialize services
	jwtService, err := services.NewJWTService(cfg.JWTIssuer, cfg.JWTExpiry, cfg.RefreshExpiry)
	if err != nil {
		log.Fatal("Failed to initialize JWT service:", err)
	}
	
	passwordService := services.NewDefaultPasswordService()
	
	// Initialize services
	userService := services.NewUserService(db, passwordService)
	organizationService := services.NewOrganizationService(db)
	projectService := services.NewProjectService(db, cfg.DSNHost)
	errorService := services.NewErrorService(db)
	issueService := services.NewIssueService(db.DB)
	
	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtService)
	organizationMiddleware := middleware.NewOrganizationMiddleware(organizationService)
	projectMiddleware := middleware.NewProjectMiddleware(projectService)
	
	// Initialize handlers
	userHandler := handlers.NewUserHandler(userService, jwtService)
	organizationHandler := handlers.NewOrganizationHandler(organizationService)
	projectHandler := handlers.NewProjectHandler(projectService)
	errorHandler := handlers.NewErrorHandler(errorService)
	issueHandler := handlers.NewIssueHandler(issueService)
	
	// Skip migrations for now since they're handled by docker-compose init
	log.Println("Skipping migrations - handled by docker-compose init")
	
	// Set up Chi router
	r := chi.NewRouter()
	
	// Apply global middleware
	r.Use(middleware.RecoveryMiddleware)
	r.Use(middleware.RequestIDMiddleware)
	r.Use(middleware.LoggingMiddleware)
	r.Use(middleware.SecurityMiddleware)
	r.Use(middleware.CORSMiddleware(cfg.CORSOrigins))
	r.Use(middleware.ContentTypeMiddleware)
	
	// Health check endpoint (publicly accessible)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		// Test database connection
		sqlDB, err := db.DB.DB()
		if err != nil || sqlDB.Ping() != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "unhealthy",
				"error":  "Database connection failed",
			})
			return
		}
		
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":   "healthy",
			"database": "connected",
			"services": map[string]string{
				"jwt":      "initialized",
				"password": "initialized",
			},
		})
	})
	
	// API version endpoint (publicly accessible)
	r.Get("/api/version", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"version": "1.0.0",
			"name":    "minisentry-api",
		})
	})
	
	// Error ingestion routes (DSN authenticated, separate from main API)
	errorHandler.RegisterRoutes(r, projectMiddleware)

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Register user routes
		userHandler.RegisterRoutes(r, authMiddleware)
		
		// Register organization routes
		organizationHandler.RegisterRoutes(r, authMiddleware, organizationMiddleware)
		
		// Register project routes
		projectHandler.RegisterRoutes(r, authMiddleware, organizationMiddleware, projectMiddleware)
		
		// Register issue routes
		issueHandler.RegisterRoutes(r, authMiddleware, projectMiddleware)
		
		// Example public route
		r.Get("/public", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{
				"message": "This is a public endpoint",
			})
		})
		
		// Example protected route
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.RequireAuth)
			
			r.Get("/protected", func(w http.ResponseWriter, r *http.Request) {
				user, ok := middleware.GetUserFromContext(r.Context())
				if !ok {
					w.WriteHeader(http.StatusInternalServerError)
					json.NewEncoder(w).Encode(map[string]string{
						"error": "Failed to get user from context",
					})
					return
				}
				
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"message": "This is a protected endpoint",
					"user":    user,
				})
			})
		})
		
		// Example optional authentication route
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.OptionalAuth)
			
			r.Get("/optional", func(w http.ResponseWriter, r *http.Request) {
				user, ok := middleware.GetUserFromContext(r.Context())
				
				response := map[string]interface{}{
					"message": "This endpoint works with or without authentication",
				}
				
				if ok {
					response["user"] = user
					response["authenticated"] = true
				} else {
					response["authenticated"] = false
				}
				
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(response)
			})
		})
	})
	
	// 404 handler
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Not Found",
			"message": "The requested endpoint does not exist",
		})
	})
	
	// 405 handler
	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Method Not Allowed",
			"message": "The requested method is not allowed for this endpoint",
		})
	})
	
	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	log.Printf("Starting server on %s", addr)
	log.Printf("Available endpoints:")
	log.Printf("  GET  /health - Health check")
	log.Printf("  GET  /api/version - API version")
	log.Printf("  GET  /api/v1/public - Public endpoint")
	log.Printf("  GET  /api/v1/protected - Protected endpoint (requires auth)")
	log.Printf("  GET  /api/v1/optional - Optional auth endpoint")
	log.Printf("Auth endpoints:")
	log.Printf("  POST /api/v1/auth/register - User registration")
	log.Printf("  POST /api/v1/auth/login - User login")
	log.Printf("  POST /api/v1/auth/refresh - Refresh JWT token")
	log.Printf("  POST /api/v1/auth/logout - User logout (requires auth)")
	log.Printf("  GET  /api/v1/auth/profile - Get user profile (requires auth)")
	log.Printf("  PUT  /api/v1/auth/profile - Update user profile (requires auth)")
	log.Printf("  PUT  /api/v1/auth/password - Change password (requires auth)")
	log.Printf("Organization endpoints:")
	log.Printf("  POST /api/v1/organizations - Create organization (requires auth)")
	log.Printf("  GET  /api/v1/organizations - List user organizations (requires auth)")
	log.Printf("  GET  /api/v1/organizations/{id} - Get organization details (requires member access)")
	log.Printf("  PUT  /api/v1/organizations/{id} - Update organization (requires admin/owner)")
	log.Printf("  DELETE /api/v1/organizations/{id} - Delete organization (requires owner)")
	log.Printf("  GET  /api/v1/organizations/{id}/members - List organization members (requires member access)")
	log.Printf("  POST /api/v1/organizations/{id}/members - Add member (requires admin/owner)")
	log.Printf("  PUT  /api/v1/organizations/{id}/members/{user_id} - Update member role (requires owner)")
	log.Printf("  DELETE /api/v1/organizations/{id}/members/{user_id} - Remove member (requires admin/owner)")
	log.Printf("Project endpoints:")
	log.Printf("  POST /api/v1/organizations/{org_id}/projects - Create project (requires admin/owner)")
	log.Printf("  GET  /api/v1/organizations/{org_id}/projects - List organization projects (requires member access)")
	log.Printf("  GET  /api/v1/projects/{id} - Get project details (requires member access)")
	log.Printf("  PUT  /api/v1/projects/{id} - Update project (requires admin/owner)")
	log.Printf("  DELETE /api/v1/projects/{id} - Delete project (requires admin/owner)")
	log.Printf("  POST /api/v1/projects/{id}/keys/regenerate - Regenerate project API key (requires admin/owner)")
	log.Printf("  PUT  /api/v1/projects/{id}/configuration - Update project configuration (requires admin/owner)")
	log.Printf("Issue management endpoints:")
	log.Printf("  GET  /api/v1/projects/{id}/issues - List project issues with filters (requires member access)")
	log.Printf("  GET  /api/v1/projects/{id}/issues/stats - Get issue statistics (requires member access)")
	log.Printf("  GET  /api/v1/issues/{id} - Get issue details (requires auth)")
	log.Printf("  PUT  /api/v1/issues/{id} - Update issue status/assignment (requires auth)")
	log.Printf("  POST /api/v1/issues/{id}/comments - Add comment to issue (requires auth)")
	log.Printf("  GET  /api/v1/issues/{id}/comments - List issue comments (requires auth)")
	log.Printf("  GET  /api/v1/issues/{id}/activity - Get issue activity timeline (requires auth)")
	log.Printf("  GET  /api/v1/issues/{id}/events - List issue events (requires auth)")
	log.Printf("  POST /api/v1/issues/bulk-update - Bulk update issues (requires auth)")
	log.Printf("Error ingestion endpoints:")
	log.Printf("  POST /api/{project_id}/store/ - Sentry-compatible error ingestion (requires DSN)")
	log.Printf("  POST /api/v1/errors/ingest - Alternative error ingestion (requires DSN)")
	log.Printf("  GET  /api/v1/errors/stats - Get error statistics (requires DSN)")
	log.Printf("  GET  /api/v1/errors/issues/{issue_id}/events - Get issue events (requires DSN)")
	
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}