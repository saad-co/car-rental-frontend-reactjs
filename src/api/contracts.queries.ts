import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** A saved contract draft: the typed inputs plus the numbers calculated from them (D71), as the API returns it. */
export type ContractDraft = components["schemas"]["ContractDto"];

/** What the admin types for a contract: cents are whole cents, `startDate` is `YYYY-MM-DD`; the details are optional. */
export type ContractInput = components["schemas"]["ContractInputDto"];

/** The part of the inputs the numbers are calculated from (the rate, term and charges; none of the details). */
export type ContractNumbersInput =
  components["schemas"]["ContractNumbersInputDto"];

/** One company of the Lessor list: its name is also printed as the company's signature. */
export type ContractCompany = components["schemas"]["ContractCompanyDto"];

/** The calculated numbers (rate breakdown, totals, end date). */
export type ContractNumbers = components["schemas"]["ContractNumbersDto"];

/** `weekly` | `daily`, from the generated types. */
export type ContractSchedule = ContractInput["schedule"];

/** Definition of the driver's draft query. */
const draftOptions = (driverId: string) =>
  queryOptions({
    queryKey: queryKeys.contracts.draft(driverId),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/drivers/{driverId}/contract-draft",
        { params: { path: { driverId } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the contract failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/** The driver's contract draft: `data.draft` is the draft, or null when there is none. */
export function useContractDraft(driverId: string) {
  return useQuery(draftOptions(driverId));
}

/** The five companies a contract's Lessor can be (a fixed list: not paginated). */
export function useContractCompanies() {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.contracts.companies,
      queryFn: async () => {
        const { data, error, response } = await api.GET("/contracts/companies");
        if (!data) {
          throw new Error(
            apiErrorMessage(
              error,
              `Loading the companies failed (${response.status}).`,
            ),
          );
        }
        return data;
      },
    }),
  );
}

/**
 * The calculated numbers for some inputs, from `POST /contracts/calculate` (nothing is saved). The inputs are sent
 * 300 ms after the last change, so typing does not send a request per key. Pass null while the inputs are not valid:
 * nothing is sent then. The result holds the inputs it was calculated for, so the screen never mixes numbers with
 * different inputs; while a new answer loads, the previous one stays.
 */
export function useContractNumbers(input: ContractNumbersInput | null) {
  const json = useDebouncedValue(input ? JSON.stringify(input) : null, 300);
  return useQuery({
    queryKey: queryKeys.contracts.numbers(json ?? ""),
    enabled: json !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // `json` is what we stringified above, so parsing it back gives the same inputs.
      const body = JSON.parse(json ?? "null") as ContractNumbersInput;
      const { data, error, response } = await api.POST("/contracts/calculate", {
        body,
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Calculating failed (${response.status}).`),
        );
      }
      return { input: body, numbers: data };
    },
  });
}

/** Starts the driver's draft; the draft query shows it at once. */
export function useCreateContractDraft(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ContractInput) => {
      const { data, error, response } = await api.POST(
        "/drivers/{driverId}/contracts",
        { params: { path: { driverId } }, body },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Saving failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: (draft) =>
      queryClient.setQueryData(queryKeys.contracts.draft(driverId), { draft }),
  });
}

/** Saves every input of a draft; the draft query shows it at once. */
export function useUpdateContractDraft(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: ContractInput }) => {
      const { data, error, response } = await api.PUT("/contracts/{id}", {
        params: { path: { id: vars.id } },
        body: vars.body,
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Saving failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: (draft) =>
      queryClient.setQueryData(queryKeys.contracts.draft(driverId), { draft }),
  });
}

/** Deletes the draft; the draft query shows "no draft" at once. */
export function useDeleteContractDraft(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE("/contracts/{id}", {
        params: { path: { id } },
      });
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(error, `Deleting failed (${response.status}).`),
        );
      }
    },
    onSuccess: () =>
      queryClient.setQueryData(queryKeys.contracts.draft(driverId), {
        draft: null,
      }),
  });
}
