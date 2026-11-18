import { useQueryClient, useMutation } from "@tanstack/react-query";

export function useOptimisticMutation({
  mutationFn,
  queryKey,
  dataTransformer,
  onSuccess
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Get previous data
      const previousData = queryClient.getQueryData(queryKey);

      // Update cache optimistically
      if (dataTransformer && previousData) {
        const optimisticData = dataTransformer(previousData, variables);
        queryClient.setQueryData(queryKey, optimisticData);
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate to sync with server
      queryClient.invalidateQueries({ queryKey });
      if (onSuccess) {
        onSuccess(data, variables);
      }
    }
  });
}