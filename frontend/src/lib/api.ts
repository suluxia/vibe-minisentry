import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'
import { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  User,
  UpdateProfileRequest,
  ChangePasswordRequest,
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationMember,
  AddMemberRequest,
  UpdateMemberRoleRequest,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectConfigurationRequest,
  ProjectKeyResponse,
  Issue,
  IssueFilters,
  IssueUpdateRequest,
  IssueComment,
  IssueCommentRequest,
  IssueActivity,
  IssueStats,
  BulkUpdateIssuesRequest,
  BulkUpdateIssuesResponse,
  PaginatedResponse,
  ErrorResponse
} from '@/types/api'

export interface ApiError extends Error {
  response?: {
    data: ErrorResponse
    status: number
  }
  status?: number
}

class ApiClient {
  private axios: AxiosInstance
  private tokenRefreshPromise: Promise<string> | null = null

  constructor() {
    this.axios = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.axios.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle token refresh
    this.axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const newToken = await this.refreshAccessToken()
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              return this.axios(originalRequest)
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearTokens()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(this.createApiError(error))
      }
    )
  }

  private createApiError(error: AxiosError): ApiError {
    const apiError = new Error(error.message) as ApiError
    apiError.name = 'ApiError'
    apiError.response = error.response as any
    apiError.status = error.response?.status
    return apiError
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token')
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise
    }

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return null
    }

    this.tokenRefreshPromise = this.performTokenRefresh(refreshToken)
    
    try {
      const newToken = await this.tokenRefreshPromise
      return newToken
    } finally {
      this.tokenRefreshPromise = null
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<string> {
    const response = await axios.post<AuthResponse>('/api/auth/refresh', {
      refresh_token: refreshToken
    })

    const { access_token, refresh_token: newRefreshToken } = response.data
    this.setTokens(access_token, newRefreshToken)
    return access_token
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.axios.post<AuthResponse>('/auth/login', credentials)
    const { access_token, refresh_token } = response.data
    this.setTokens(access_token, refresh_token)
    return response.data
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.axios.post<AuthResponse>('/auth/register', data)
    const { access_token, refresh_token } = response.data
    this.setTokens(access_token, refresh_token)
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await this.axios.post('/auth/logout')
    } finally {
      this.clearTokens()
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await this.axios.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken
    })
    const { access_token, refresh_token: newRefreshToken } = response.data
    this.setTokens(access_token, newRefreshToken)
    return response.data
  }

  // User methods
  async getCurrentUser(): Promise<User> {
    const response = await this.axios.get<User>('/users/me')
    return response.data
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await this.axios.put<User>('/users/me', data)
    return response.data
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await this.axios.put('/users/me/password', data)
  }

  // Organization methods
  async getOrganizations(): Promise<Organization[]> {
    const response = await this.axios.get<{ organizations: Organization[] }>('/organizations')
    return response.data.organizations
  }

  async getOrganization(slug: string): Promise<Organization> {
    const response = await this.axios.get<Organization>(`/organizations/${slug}`)
    return response.data
  }

  async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    const response = await this.axios.post<Organization>('/organizations', data)
    return response.data
  }

  async updateOrganization(slug: string, data: UpdateOrganizationRequest): Promise<Organization> {
    const response = await this.axios.put<Organization>(`/organizations/${slug}`, data)
    return response.data
  }

  async deleteOrganization(slug: string): Promise<void> {
    await this.axios.delete(`/organizations/${slug}`)
  }

  async getOrganizationMembers(slug: string): Promise<OrganizationMember[]> {
    const response = await this.axios.get<{ members: OrganizationMember[] }>(`/organizations/${slug}/members`)
    return response.data.members
  }

  async addOrganizationMember(slug: string, data: AddMemberRequest): Promise<OrganizationMember> {
    const response = await this.axios.post<OrganizationMember>(`/organizations/${slug}/members`, data)
    return response.data
  }

  async updateMemberRole(slug: string, userId: string, data: UpdateMemberRoleRequest): Promise<OrganizationMember> {
    const response = await this.axios.put<OrganizationMember>(`/organizations/${slug}/members/${userId}`, data)
    return response.data
  }

  async removeOrganizationMember(slug: string, userId: string): Promise<void> {
    await this.axios.delete(`/organizations/${slug}/members/${userId}`)
  }

  // Project methods
  async getProjects(orgSlug: string): Promise<Project[]> {
    const response = await this.axios.get<{ projects: Project[] }>(`/organizations/${orgSlug}/projects`)
    return response.data.projects
  }

  async getProject(orgSlug: string, projectSlug: string): Promise<Project> {
    const response = await this.axios.get<Project>(`/organizations/${orgSlug}/projects/${projectSlug}`)
    return response.data
  }

  async createProject(orgSlug: string, data: CreateProjectRequest): Promise<Project> {
    const response = await this.axios.post<Project>(`/organizations/${orgSlug}/projects`, data)
    return response.data
  }

  async updateProject(orgSlug: string, projectSlug: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await this.axios.put<Project>(`/organizations/${orgSlug}/projects/${projectSlug}`, data)
    return response.data
  }

  async deleteProject(orgSlug: string, projectSlug: string): Promise<void> {
    await this.axios.delete(`/organizations/${orgSlug}/projects/${projectSlug}`)
  }

  async updateProjectConfiguration(orgSlug: string, projectSlug: string, data: ProjectConfigurationRequest): Promise<Project> {
    const response = await this.axios.put<Project>(`/organizations/${orgSlug}/projects/${projectSlug}/configuration`, data)
    return response.data
  }

  async regenerateProjectKey(orgSlug: string, projectSlug: string): Promise<ProjectKeyResponse> {
    const response = await this.axios.post<ProjectKeyResponse>(`/organizations/${orgSlug}/projects/${projectSlug}/regenerate-key`)
    return response.data
  }

  // Issue methods
  async getIssues(orgSlug: string, projectSlug: string, filters?: IssueFilters): Promise<PaginatedResponse<Issue>> {
    const response = await this.axios.get<PaginatedResponse<Issue>>(`/organizations/${orgSlug}/projects/${projectSlug}/issues`, {
      params: filters
    })
    return response.data
  }

  async getIssue(orgSlug: string, projectSlug: string, issueId: string): Promise<Issue> {
    const response = await this.axios.get<Issue>(`/organizations/${orgSlug}/projects/${projectSlug}/issues/${issueId}`)
    return response.data
  }

  async updateIssue(orgSlug: string, projectSlug: string, issueId: string, data: IssueUpdateRequest): Promise<Issue> {
    const response = await this.axios.put<Issue>(`/organizations/${orgSlug}/projects/${projectSlug}/issues/${issueId}`, data)
    return response.data
  }

  async deleteIssue(orgSlug: string, projectSlug: string, issueId: string): Promise<void> {
    await this.axios.delete(`/organizations/${orgSlug}/projects/${projectSlug}/issues/${issueId}`)
  }

  async getIssueComments(orgSlug: string, projectSlug: string, issueId: string, page = 1, limit = 25): Promise<PaginatedResponse<IssueComment>> {
    const response = await this.axios.get<PaginatedResponse<IssueComment>>(
      `/organizations/${orgSlug}/projects/${projectSlug}/issues/${issueId}/comments`,
      { params: { page, limit } }
    )
    return response.data
  }

  async addIssueComment(orgSlug: string, projectSlug: string, issueId: string, data: IssueCommentRequest): Promise<IssueComment> {
    const response = await this.axios.post<IssueComment>(`/organizations/${orgSlug}/projects/${projectSlug}/issues/${issueId}/comments`, data)
    return response.data
  }

  async getIssueActivity(orgSlug: string, projectSlug: string, issueId: string, page = 1, limit = 25): Promise<PaginatedResponse<IssueActivity>> {
    const response = await this.axios.get<PaginatedResponse<IssueActivity>>(
      `/organizations/${orgSlug}/projects/${projectSlug}/issues/${issueId}/activity`,
      { params: { page, limit } }
    )
    return response.data
  }

  async getIssueStats(orgSlug: string, projectSlug: string): Promise<IssueStats> {
    const response = await this.axios.get<IssueStats>(`/organizations/${orgSlug}/projects/${projectSlug}/issues/stats`)
    return response.data
  }

  async bulkUpdateIssues(orgSlug: string, projectSlug: string, data: BulkUpdateIssuesRequest): Promise<BulkUpdateIssuesResponse> {
    const response = await this.axios.post<BulkUpdateIssuesResponse>(`/organizations/${orgSlug}/projects/${projectSlug}/issues/bulk-update`, data)
    return response.data
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.axios.get<{ status: string }>('/health')
    return response.data
  }
}

export const apiClient = new ApiClient()
export default apiClient