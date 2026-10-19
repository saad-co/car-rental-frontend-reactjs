import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** One quick-pick preset (B86, D66), exactly as the API returns it. */
export type LedgerPreset = components["schemas"]["LedgerPresetDto"];

/** `charge` | `credit`, from the generated types. */
export type LedgerPresetKind = components["schemas"]["LedgerPresetKind"];

/** Definition of the presets query. */
const presetsOptions = () =>
  queryOptions({
    queryKey: queryKeys.ledgerPresets.all,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/ledger-presets");
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the ledger presets failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/** Every preset, charges first, each kind in the order of its cards: for Settings and the New ledger entry window. */
export function useLedgerPresets() {
  return useQuery(presetsOptions());
}

/** Refetches the presets after any change to the list. */
function useRefreshPresets() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.ledgerPresets.all });
}

/** What an admin fills in for a preset. `amountCents` null (or left out) means "enter amount". */
export interface PresetInput {
  name: string;
  amountCents: number | null;
  description: string;
}

/** Adds a preset at the end of its kind; the presets refetch. */
export function useCreateLedgerPreset() {
  const refresh = useRefreshPresets();
  return useMutation({
    mutationFn: async (vars: PresetInput & { kind: LedgerPresetKind }) => {
      const { data, error, response } = await api.POST("/ledger-presets", {
        body: vars,
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Adding failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: refresh,
  });
}

/** Saves a preset's name, amount and description; the presets refetch. */
export function useUpdateLedgerPreset() {
  const refresh = useRefreshPresets();
  return useMutation({
    mutationFn: async (vars: PresetInput & { id: string }) => {
      const { id, ...body } = vars;
      const { data, error, response } = await api.PUT("/ledger-presets/{id}", {
        params: { path: { id } },
        body,
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Saving failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: refresh,
  });
}

/** Deletes a preset (entries made from it keep their text and amount); the presets refetch. */
export function useDeleteLedgerPreset() {
  const refresh = useRefreshPresets();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE("/ledger-presets/{id}", {
        params: { path: { id } },
      });
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(error, `Deleting failed (${response.status}).`),
        );
      }
    },
    onSuccess: refresh,
  });
}

/** Sets the order of one kind's cards: `ids` are all of that kind's preset ids in the new order; the presets refetch. */
export function useReorderLedgerPresets() {
  const refresh = useRefreshPresets();
  return useMutation({
    mutationFn: async (vars: { kind: LedgerPresetKind; ids: string[] }) => {
      const { error, response } = await api.PUT("/ledger-presets/order", {
        body: vars,
      });
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(error, `Reordering failed (${response.status}).`),
        );
      }
    },
    onSuccess: refresh,
  });
}
