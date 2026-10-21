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

/**
 * A saved contract: the typed inputs plus the numbers calculated from them (D71), as the API returns it. A draft has no
 * `sentAt`; once it is sent (step 3) it has one and it cannot change any more; its `status` then follows firma (step 4).
 */
export type ContractDraft = components["schemas"]["ContractDto"];

/** Where a contract is (step 4): `draft`, `sent`, `viewed`, then `signed`, `declined`, `expired` or `cancelled`. */
export type ContractStatus = ContractDraft["status"];

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

/** Definition of the driver's current contract query. */
const currentOptions = (driverId: string) =>
  queryOptions({
    queryKey: queryKeys.contracts.current(driverId),
    // A contract waiting for the driver changes on its own (the webhook, or the 5-minute check): look again every 30 s.
    refetchInterval: (query) => {
      const status = query.state.data?.contract?.status;
      return status === "sent" || status === "viewed" ? 30_000 : false;
    },
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/drivers/{driverId}/contract",
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

/** The driver's current contract: `data.contract` is the open draft or else the one sent last, null when there is none. */
export function useDriverContract(driverId: string) {
  return useQuery(currentOptions(driverId));
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

/** Starts the driver's draft; the contract query shows it at once. */
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
    onSuccess: (contract) =>
      queryClient.setQueryData(queryKeys.contracts.current(driverId), {
        contract,
      }),
  });
}

/** Saves every input of a draft; the contract query shows it at once. */
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
    onSuccess: (contract) =>
      queryClient.setQueryData(queryKeys.contracts.current(driverId), {
        contract,
      }),
  });
}

/** Deletes the draft; the contract query shows "no contract" at once. */
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
      queryClient.setQueryData(queryKeys.contracts.current(driverId), {
        contract: null,
      }),
  });
}

/**
 * Why a send was refused. When values are still empty, `missing` lists their names (the API's 400); otherwise it is empty
 * and `message` is the API's own sentence (already sent, not an Illinois company, firma refused, signing not set up).
 */
export class SendContractError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "SendContractError";
    this.missing = missing;
  }
}

/** Sends the driver's draft to the driver to sign (firma); the contract query then shows it as sent. */
export function useSendContract(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error, response } = await api.POST("/contracts/{id}/send", {
        params: { path: { id } },
      });
      if (!data) {
        const missing = (error as { missing?: unknown } | undefined)?.missing;
        throw new SendContractError(
          apiErrorMessage(error, `Sending failed (${response.status}).`),
          Array.isArray(missing) ? (missing as string[]) : [],
        );
      }
      return data;
    },
    onSuccess: (contract) => {
      queryClient.setQueryData(queryKeys.contracts.current(driverId), {
        contract,
      });
      return queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.detail(driverId),
      });
    },
  });
}

/**
 * Links to a signed contract's PDF and certificate (`GET /contracts/:id/documents`). The API mints them for 10 minutes and
 * never stores them, so they are fetched again each time the page opens (and every 4 minutes while it stays open), never
 * served from the cache. Pass `enabled: false` until the contract is signed and its files are saved.
 */
export function useContractDocuments(contractId: string, enabled: boolean) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.contracts.documents(contractId),
      enabled,
      gcTime: 0,
      staleTime: 0,
      refetchInterval: 4 * 60_000,
      queryFn: async () => {
        const { data, error, response } = await api.GET(
          "/contracts/{id}/documents",
          { params: { path: { id: contractId } } },
        );
        if (!data) {
          throw new Error(
            apiErrorMessage(
              error,
              `Loading the signed files failed (${response.status}).`,
            ),
          );
        }
        return data;
      },
    }),
  );
}
