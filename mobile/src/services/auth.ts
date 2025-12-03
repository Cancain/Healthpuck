import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';

const TOKEN_KEY = '@healthpuck:token';
const USER_KEY = '@healthpuck:user';

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export class AuthService {
  private static instance: AuthService;
  private currentToken: string | null = null;
  private currentUser: User | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({error: 'Login failed'}));
        throw new Error(error.error || 'Login failed');
      }

      const data: LoginResponse = await response.json();

      if (!data.token) {
        throw new Error('No token received from server');
      }

      await this.setToken(data.token);
      await this.setUser(data.user);

      this.currentToken = data.token;
      this.currentUser = data.user;

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    this.currentToken = null;
    this.currentUser = null;
  }

  async getToken(): Promise<string | null> {
    if (this.currentToken) {
      return this.currentToken;
    }

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      this.currentToken = token;
    }
    return token;
  }

  async getUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (userJson) {
      const user = JSON.parse(userJson);
      this.currentUser = user;
      return user;
    }
    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  private async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    this.currentToken = token;
  }

  private async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser = user;
  }

  async refreshUser(): Promise<User | null> {
    try {
      const token = await this.getToken();
      if (!token) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ME}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
        }
        return null;
      }

      const user: User = await response.json();
      await this.setUser(user);
      return user;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return null;
    }
  }
}

export const authService = AuthService.getInstance();
