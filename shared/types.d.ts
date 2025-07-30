export interface CreatePostRequest {
    title: string;
    content: string;
}
export interface CreatePostResponse {
    id: string;
    secret: string;
}
export interface UpdatePostRequest {
    secret: string;
    title: string;
    content: string;
}
export interface DeletePostRequest {
    secret: string;
}
export interface Post {
    id: string;
    secret: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}
export interface APIError {
    code: number;
    message: string;
    timestamp: string;
}
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: APIError;
}
export interface HealthResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
}
