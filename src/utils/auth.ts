/**
 * Authentication utilities for customer session management
 */

export interface CustomerUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  vatNumber?: string;
  loginTime?: number;
  rememberMe?: boolean;
}

/**
 * Get the current authenticated customer user from storage
 * Checks both localStorage (persistent) and sessionStorage (session-only)
 */
export const getCurrentUser = (): CustomerUser | null => {
  try {
    // Check localStorage first (persistent sessions)
    let userData = localStorage.getItem("customerUser");
    if (!userData) {
      // Check sessionStorage (current session only)
      userData = sessionStorage.getItem("customerUser");
    }
    
    if (userData) {
      return JSON.parse(userData) as CustomerUser;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * Save user session to appropriate storage based on rememberMe preference
 */
export const saveUserSession = (user: CustomerUser, rememberMe: boolean = false): void => {
  const userSession = {
    ...user,
    loginTime: new Date().getTime(),
    rememberMe
  };

  if (rememberMe) {
    // Store in localStorage for long-term (persistent across browser sessions)
    localStorage.setItem("customerUser", JSON.stringify(userSession));
    localStorage.setItem("customerRememberMe", "true");
    // Clear any session storage
    sessionStorage.removeItem("customerUser");
  } else {
    // Store in sessionStorage (cleared when browser closes)
    sessionStorage.setItem("customerUser", JSON.stringify(userSession));
    // Remove any existing persistent session
    localStorage.removeItem("customerUser");
    localStorage.removeItem("customerRememberMe");
  }
};

/**
 * Clear user session from all storage
 */
export const clearUserSession = (): void => {
  localStorage.removeItem("customerUser");
  localStorage.removeItem("customerRememberMe");
  sessionStorage.removeItem("customerUser");
};

/**
 * Redirect to login if not authenticated
 */
export const requireAuth = (router: any): CustomerUser | null => {
  const user = getCurrentUser();
  if (!user) {
    router.push("/login");
    return null;
  }
  return user;
};
