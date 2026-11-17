import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import type { NewLedgerEntry } from "./ledger.queries";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** One vehicle check-in or check-out as the driver page lists it (Module 3). Never holds the link. */
export type Inspection = components["schemas"]["InspectionDto"];

/** One inspection with its photos, readings and activity log, for the staff page. */
export type InspectionDetail = components["schemas"]["InspectionDetailDto"];

/** One photo of an inspection with its signed links (valid ten minutes). */
export type InspectionPhoto = components["schemas"]["InspectionPhotoDto"];

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

/** The signed photo links last ten minutes, so the page reads them again before they run out. */
const PHOTO_LINK_REFRESH_MS = 8 * 60 * 1000;

/** One inspection with its photos, for the staff page. */
export function useInspection(id: string) {
  return useQuery({
    queryKey: queryKeys.inspection(id),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/inspections/{id}", {
        params: { path: { id } },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the inspection failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    staleTime: PHOTO_LINK_REFRESH_MS / 2,
    refetchInterval: PHOTO_LINK_REFRESH_MS,
  });
}

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

/** The latest check-in and check-out of a driver (revoked ones left out), for the summary card on the ledger page. */
export type LatestInspections = components["schemas"]["LatestInspectionsDto"];

/** One line of an inspection's activity log. */
export type InspectionEvent = components["schemas"]["InspectionEventDto"];

/** The driver's latest check-in and check-out. Shares the driver's inspections key, so any change to one refetches it. */
export function useLatestInspections(driverId: string) {
  return useQuery({
    queryKey: queryKeys.drivers.latestInspections(driverId),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/drivers/{id}/inspections/latest",
        { params: { path: { id: driverId } } },
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
  });
}

/** What changed on an inspection: its page, the driver's lists and the latest pair all read again. */
function useRefreshInspection(inspectionId: string) {
  const queryClient = useQueryClient();
  return (driverId: string) =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.inspection(inspectionId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.inspections(driverId),
      }),
    ]);
}

/** Marks a submitted inspection reviewed, with an optional note. */
export function useReviewInspection(inspectionId: string, driverId: string) {
  const refresh = useRefreshInspection(inspectionId);
  return useMutation({
    mutationFn: async (note: string) => {
      const { data, error, response } = await api.POST(
        "/inspections/{id}/review",
        {
          params: { path: { id: inspectionId } },
          body: { note: note.trim() === "" ? null : note },
        },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Reviewing failed (${response.status}).`),
        );
      }
      return data;
    },
    onSettled: () => refresh(driverId),
  });
}

/** Adds a staff note to the inspection's activity log. */
export function useAddInspectionNote(inspectionId: string, driverId: string) {
  const refresh = useRefreshInspection(inspectionId);
  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error, response } = await api.POST(
        "/inspections/{id}/notes",
        { params: { path: { id: inspectionId } }, body: { text } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Saving the note failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSettled: () => refresh(driverId),
  });
}

// ------------------------------------------------------------ compare (step 3)

/** A check-out set beside its check-in, with the damage marked so far. `available: false` carries a `reason` in words. */
export type InspectionCompare = components["schemas"]["InspectionCompareDto"];

/** One shot: the check-in and check-out photos, the damage item staff marked (null = no change), and each side's damage answer and close-ups (D112). */
export type ComparePair = components["schemas"]["ComparePairDto"];

/** New damage found on a check-out photo, and the charge it led to. */
export type DamageItem = components["schemas"]["DamageItemDto"];

/** The answer of "Create charge": the damage item (now charged) and the ledger entry it made. */
export type ChargedDamage = components["schemas"]["ChargeDamageItemResultDto"];

/** The check-out beside its check-in. Signed photo links last ten minutes, so it is read again before they run out. */
export function useInspectionCompare(id: string) {
  return useQuery({
    queryKey: queryKeys.inspectionCompare(id),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/inspections/{id}/compare",
        { params: { path: { id } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the comparison failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    staleTime: PHOTO_LINK_REFRESH_MS / 2,
    refetchInterval: PHOTO_LINK_REFRESH_MS,
  });
}

/** Everything a damage change can alter: the comparison, the inspection (its status and log) and the driver's lists. */
function useRefreshAfterDamage(inspectionId: string, driverId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.inspectionCompare(inspectionId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.inspection(inspectionId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.inspections(driverId),
      }),
    ]);
}

/** "New damage" on one check-out photo. */
export function useMarkDamage(inspectionId: string, driverId: string) {
  const refresh = useRefreshAfterDamage(inspectionId, driverId);
  return useMutation({
    mutationFn: async (vars: { photoId: string; description: string }) => {
      const { data, error, response } = await api.POST(
        "/inspections/{id}/damage-items",
        { params: { path: { id: inspectionId } }, body: vars },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Marking the damage failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSuccess: refresh,
  });
}

/** Back to "No change" (only before the damage is charged). */
export function useUnmarkDamage(inspectionId: string, driverId: string) {
  const refresh = useRefreshAfterDamage(inspectionId, driverId);
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error, response } = await api.DELETE("/damage-items/{id}", {
        params: { path: { id: itemId } },
      });
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(
            error,
            `Removing the mark failed (${response.status}).`,
          ),
        );
      }
    },
    onSuccess: refresh,
  });
}

/**
 * Charges the driver for a damage item: one ledger debit. The body is the ledger's own "new entry" body, so the dialog that makes
 * it is the ledger's. Sending the same `requestKey` again never makes a second charge.
 */
export function useChargeDamage(inspectionId: string, driverId: string) {
  const refresh = useRefreshAfterDamage(inspectionId, driverId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { itemId: string; entry: NewLedgerEntry }) => {
      const { data, error, response } = await api.POST(
        "/damage-items/{id}/charge",
        { params: { path: { id: vars.itemId } }, body: vars.entry },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Charging failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: () =>
      Promise.all([
        refresh(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.drivers.ledger(driverId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.drivers.detail(driverId),
        }),
      ]),
  });
}

// -------------------------------------------------------------- export (step 4)

/** Which file "Download all" makes: the photos as a ZIP, or the one-file report. */
export type InspectionExportKind = "zip" | "pdf";

/**
 * Fetches the ZIP of an inspection's photos or its PDF report (admin only; the token is a header, so this is a fetch, not a
 * link) and returns the file's bytes. The caller saves them. Nothing is cached: every export writes an audit line.
 */
export function useExportInspection() {
  return useMutation({
    mutationFn: async (vars: {
      inspectionId: string;
      kind: InspectionExportKind;
    }): Promise<Blob> => {
      const params = { path: { id: vars.inspectionId } };
      const { data, error, response } =
        vars.kind === "zip"
          ? await api.GET("/inspections/{id}/export.zip", {
              params,
              parseAs: "blob",
            })
          : await api.GET("/inspections/{id}/report.pdf", {
              params,
              parseAs: "blob",
            });
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(error, `The download failed (${response.status}).`),
        );
      }
      return data as unknown as Blob;
    },
  });
}
