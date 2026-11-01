import { http } from '@/utils/http';

export interface HealthResult {
  status: string;
  message?: string | null;
}

export interface InfrastructureHealthResult extends HealthResult {
  components: {
    mysql: HealthResult;
    redis: HealthResult;
  };
}

export async function getApplicationHealth() {
  const { data } = await http.get<HealthResult>('/api/health');
  return data;
}


export async function getElasticsearchHealth() {
  const { data } = await http.get<HealthResult>('/api/health/elasticsearch');
  return data;
}

export async function getInfrastructureHealth() {
  const { data } = await http.get<InfrastructureHealthResult>('/api/health/infrastructure');
  return data;
}
