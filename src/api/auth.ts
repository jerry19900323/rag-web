import { http } from '@/utils/http';

export interface UserInfo {
  userId: number;
  username: string;
  displayName: string;
}

export interface CaptchaResult {
  captchaId: string;
  imageDataUri: string;
  expiresInSeconds: number;
}

export interface LoginParams {
  username: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserInfo;
}

export async function getCaptcha() {
  const { data } = await http.get<CaptchaResult>('/api/auth/captcha');
  return data;
}

export async function login(params: LoginParams) {
  const { data } = await http.post<LoginResult>('/api/auth/login', params);
  return data;
}

export async function getCurrentUser() {
  const { data } = await http.get<UserInfo>('/api/auth/me');
  return data;
}

export async function logout() {
  await http.post('/api/auth/logout');
}
