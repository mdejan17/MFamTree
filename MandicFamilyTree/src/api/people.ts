import { apiRequest } from './client.ts'
import type { Person, PersonNode } from '../data/mockDatabase.tsx'

export function fetchPeople(branchId?: number): Promise<Person[]> {
  return apiRequest<Person[]>(branchId !== undefined ? `/people?branchId=${branchId}` : '/people')
}

export function fetchPerson(id: number): Promise<Person> {
  return apiRequest<Person>(`/people/${id}`)
}

export function fetchTree(rootId: number): Promise<PersonNode> {
  return apiRequest<PersonNode>(`/tree/${rootId}`)
}

export interface PersonInput {
  firstName: string;
  lastName?: string;
  maidenName?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  residency?: string;
  note?: string;
  profilePic?: string;
  branchId?: number;
}

export function createPerson(input: PersonInput, token: string): Promise<Person> {
  return apiRequest<Person>('/people', { method: 'POST', body: input, token })
}

export function updatePerson(
  id: number,
  input: Partial<PersonInput>,
  token: string
): Promise<Person> {
  return apiRequest<Person>(`/people/${id}`, { method: 'PATCH', body: input, token })
}

export function deletePerson(id: number, token: string): Promise<void> {
  return apiRequest<void>(`/people/${id}`, { method: 'DELETE', token })
}

export interface RelationshipInput {
  personAId: number;
  personBId: number;
  type: 'parent_of' | 'spouse_of';
  startDate?: string;
  endDate?: string;
}

export function createRelationship(input: RelationshipInput, token: string): Promise<unknown> {
  return apiRequest('/relationships', { method: 'POST', body: input, token })
}

export function deleteRelationship(input: RelationshipInput, token: string): Promise<void> {
  const params = new URLSearchParams({
    personAId: String(input.personAId),
    personBId: String(input.personBId),
    type: input.type,
  });
  return apiRequest<void>(`/relationships?${params.toString()}`, { method: 'DELETE', token })
}
