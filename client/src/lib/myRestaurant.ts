import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { Restaurant } from '../types'

export function useMyRestaurant() {
  return useQuery({
    queryKey: ['my-restaurant'],
    queryFn: async () => (await api.get<{ data: Restaurant }>('/my-restaurant')).data.data,
  })
}

export function useUpdateMyRestaurant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Restaurant>) => (await api.patch<{ data: Restaurant }>('/my-restaurant', patch)).data.data,
    onSuccess: (data) => queryClient.setQueryData(['my-restaurant'], data),
  })
}
