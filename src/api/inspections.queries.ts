import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** One vehicle check-in or check-out as the driver page lists it (Module 3). Never holds the link. */
export type Inspection = components["schemas"]["InspectionDto"];

/** One page of a driver's inspections, with the vehicle the signed contract holds (null = none, so one must be typed). */
export type InspectionList = components["schemas"]["InspectionListDto"];

/** The answer of "send": the link (shown once) and what happened to the text. */
export type SentInspectionLink = components["schemas"]["SendInspectionLinkDto"];

export type InspectionType = Inspection["type"];

/** A vehicle typed for a driver whose contract holds none. */
export interface TypedVehicle {
  model: string;
  plate?: string;
  vin?: string;
}

/** Inspections per page of the Vehicle Photos card. */
export const INSPECTIONS_PAGE_SIZE = 5;

/** Definition of the list query for one driver and page. */
const inspectionsOptions = (driverId: string, page: number) =>
  queryOptions({
    queryKey: [...queryKeys.drivers.inspections(driverId), page] as const,
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/drivers/{id}/inspections",
        {
          params: {
            path: { id: driverId },
            query: { page, limit: INSPECTIONS_PAGE_SIZE },
          },
        },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the vehicle photos failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    placeholderData: keepPreviousData,
  });

/** One page of the driver's inspections, newest first. */
export function useDriverInspections(driverId: string, page: number) {
  return useQuery(inspectionsOptions(driverId, page));
}

/** Makes an inspection (or returns the open one of that type). The list refetches. */
export function useCreateInspection(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      type: InspectionType;
      vehicle?: TypedVehicle;
    }) => {
      const { data, error, response } = await api.POST(
        "/drivers/{id}/inspections",
        { params: { path: { id: driverId } }, body: vars },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Making the inspection failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.inspections(driverId),
      }),
  });
}

/** Texts the driver a fresh link. The list refetches, also when the text failed (the link was changed anyway). */
export function useSendInspectionLink(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { data, error, response } = await api.POST(
        "/inspections/{id}/send",
        { params: { path: { id: inspectionId } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Sending the link failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.inspections(driverId),
      }),
  });
}

/** Makes a fresh link to copy, without texting it. */
export function useReissueInspection(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { data, error, response } = await api.POST(
        "/inspections/{id}/reissue",
        { params: { path: { id: inspectionId } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Making the link failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.inspections(driverId),
      }),
  });
}

/** Cancels an inspection; its link stops working for good. */
export function useRevokeInspection(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { data, error, response } = await api.POST(
        "/inspections/{id}/revoke",
        { params: { path: { id: inspectionId } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Revoking failed (${response.status}).`),
        );
      }
      return data;
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.inspections(driverId),
      }),
  });
}
