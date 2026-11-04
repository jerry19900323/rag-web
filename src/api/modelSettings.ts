import { http } from '@/utils/http';

export type ModelPurpose = string;

export interface ModelUsageType {
  usageType: string;
  displayName: string;
}

export interface ModelProvider {
  provider: string;
  displayName: string;
  requiresApiKey: boolean;
  supportedPurposes: ModelPurpose[];
}

export interface ModelConnection {
  connectionId: string;
  name: string;
  provider: string;
  enabled: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderModel { modelId: string; displayName: string }
export interface ModelAssignment {
  purpose: ModelPurpose;
  connectionId: string | null;
  modelId: string | null;
  updatedAt: string | null;
}

export interface ConnectionInput {
  name: string;
  provider: string;
  enabled: boolean;
  apiKey?: string | null;
}

export async function listModelProviders() {
  const { data } = await http.get<ModelProvider[]>('/api/admin/model-providers');
  return data;
}
export async function listModelUsageTypes() {
  const { data } = await http.get<ModelUsageType[]>('/api/admin/model-usage-types');
  return data;
}
export async function listModelConnections() {
  const { data } = await http.get<ModelConnection[]>('/api/admin/model-connections');
  return data;
}
export async function saveModelConnection(input: ConnectionInput, id?: string) {
  const { data } = id
    ? await http.put<ModelConnection>(`/api/admin/model-connections/${encodeURIComponent(id)}`, input)
    : await http.post<ModelConnection>('/api/admin/model-connections', input);
  return data;
}
export async function deleteModelConnection(id: string) {
  await http.delete(`/api/admin/model-connections/${encodeURIComponent(id)}`);
}
export async function listProviderModels(id: string) {
  const { data } = await http.get<ProviderModel[]>(`/api/admin/model-connections/${encodeURIComponent(id)}/models`);
  return data;
}
export async function testModelConnection(id: string) {
  const { data } = await http.post<{ status: string; discoveredModelCount: number }>(`/api/admin/model-connections/${encodeURIComponent(id)}/test`);
  return data;
}
export async function listModelAssignments() {
  const { data } = await http.get<ModelAssignment[]>('/api/admin/model-assignments');
  return data;
}
export async function saveModelAssignment(purpose: ModelPurpose, connectionId: string | null, modelId: string | null) {
  const { data } = await http.put<ModelAssignment>(`/api/admin/model-assignments/${encodeURIComponent(purpose)}`, { connectionId, modelId });
  return data;
}
