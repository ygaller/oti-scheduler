const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(public status: number, message: string, public details?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ConsecutiveSessionsWarning extends Error {
  constructor(
    public status: number, 
    public warnings: Array<{ patientId: string; warning: string; consecutiveCount: number }>,
    public requiresConfirmation: boolean = true
  ) {
    super('Consecutive sessions warning');
    this.name = 'ConsecutiveSessionsWarning';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    
    // Handle consecutive sessions warnings (status 409)
    if (response.status === 409 && errorData.requiresConfirmation) {
      if (errorData.warnings) {
        // Multiple warnings
        throw new ConsecutiveSessionsWarning(response.status, errorData.warnings);
      } else if (errorData.warning) {
        // Single warning
        throw new ConsecutiveSessionsWarning(response.status, [{
          patientId: '',
          warning: errorData.warning,
          consecutiveCount: errorData.consecutiveCount || 0
        }]);
      }
    }
    
    throw new ApiError(
      response.status, 
      errorData.error || 'Request failed',
      errorData.details
    );
  }
  return response.json();
}

// Generic API methods
export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async delete<T = void>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new ApiError(response.status, errorData.error || 'Delete failed', errorData.details);
    }
    
    // If the response has content, parse it as JSON, otherwise return undefined
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return undefined as T;
  },
};

export { ApiError, ConsecutiveSessionsWarning };

