import { QueryClient } from "@tanstack/react-query";
import type { paths } from "./schema";

/**
 * The single TanStack Query client for the whole app, with its app-wide defaults.
 * All TanStack Query configuration lives in this file.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Coming back to the tab refetches what is on screen, so data changed elsewhere (e.g. a
      // new application from the website) shows up without a manual reload.
      refetchOnWindowFocus: true,
    },
  },
});

/** Query string of `GET /applications` (status filter, page, limit), from the generated types. */
export type ApplicationsListParams =
  paths["/applications"]["get"]["parameters"]["query"];

/** Query string of `GET /drivers` (status filter, page, limit), from the generated types. */
export type DriversListParams = paths["/drivers"]["get"]["parameters"]["query"];

/** Query string of `GET /drivers/{id}/ledger` (type, dates, search, order, page, limit), from the generated types. */
export type LedgerPageParams =
  paths["/drivers/{id}/ledger"]["get"]["parameters"]["query"];

/** Query string of `GET /payments` (status and source filters, page, limit), from the generated types. */
export type PaymentsListParams =
  paths["/payments"]["get"]["parameters"]["query"];

/** Query string of `GET /inbound-emails` (status and provider filters, page, limit). */
export type InboundEmailsListParams =
  paths["/inbound-emails"]["get"]["parameters"]["query"];

/**
 * Every query key used in the app, in one place, so a key is never mistyped when a
 * query is read, set or invalidated.
 *
 * Keys are hierarchical: invalidating `queryKeys.applications.all` (`["applications"]`)
 * refreshes every applications list and detail at once, because TanStack Query matches
 * keys by prefix.
 */
export const queryKeys = {
  /** The logged-in user (`GET /auth/me`). */
  me: ["auth", "me"] as const,
  applications: {
    all: ["applications"] as const,
    /** Prefix of every list query, whatever its filter and page. */
    lists: ["applications", "list"] as const,
    list: (params: ApplicationsListParams) =>
      ["applications", "list", params] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
    /** The uploaded documents of one application (our copies). */
    documents: (id: string) => ["applications", "documents", id] as const,
    /** The internal notes of one application (B74), all loaded pages. */
    notes: (id: string) => ["applications", "notes", id] as const,
  },
  /** The quick-pick presets of the New ledger entry window, charges and credits (B86, D66). */
  ledgerPresets: {
    all: ["ledgerPresets"] as const,
  },
  /** Contract drafts and their calculated numbers (Module 2 step 1, D71). */
  contracts: {
    all: ["contracts"] as const,
    /** The current contract of one driver: the open draft or else the one sent last (`{ contract: null }` when none). */
    current: (driverId: string) => ["contracts", "current", driverId] as const,
    /** The numbers for one set of inputs, `input` being the inputs as JSON text. */
    numbers: (input: string) => ["contracts", "numbers", input] as const,
    /** The fixed list of companies a contract's Lessor is chosen from (step 2). */
    companies: ["contracts", "companies"] as const,
  },
  /** The approve / decline text templates (B73). */
  templates: {
    all: ["templates"] as const,
  },
  drivers: {
    all: ["drivers"] as const,
    /** Prefix of every drivers list (any filter, page or search). */
    lists: ["drivers", "list"] as const,
    list: (params: DriversListParams) => ["drivers", "list", params] as const,
    detail: (id: string) => ["drivers", "detail", id] as const,
    /** Everything of one driver's ledger (the page, its overview and entry details): invalidated after any ledger change. */
    ledger: (id: string) => ["drivers", "ledger", id] as const,
    /** One page of the ledger page's table with its filters. */
    ledgerPage: (id: string, params: LedgerPageParams) =>
      ["drivers", "ledger", id, "page", params] as const,
    /** The aging tiles and the last payment. */
    ledgerOverview: (id: string) =>
      ["drivers", "ledger", id, "overview"] as const,
    /** One entry with what links to it. */
    ledgerEntry: (id: string, entryId: string) =>
      ["drivers", "ledger", id, "entry", entryId] as const,
    /** Every entry of a date range, for the printable statement. */
    ledgerStatement: (id: string, from: string, to: string) =>
      ["drivers", "ledger", id, "statement", from, to] as const,
  },
  payments: {
    all: ["payments"] as const,
    list: (params: PaymentsListParams) => ["payments", "list", params] as const,
  },
  inboundEmails: {
    all: ["inboundEmails"] as const,
    list: (params: InboundEmailsListParams) =>
      ["inboundEmails", "list", params] as const,
  },
  /** Texts with an application's or a driver's phone (the chat card). */
  sms: {
    all: ["sms"] as const,
    status: ["sms", "status"] as const,
    messages: (kind: string, id: string) =>
      ["sms", "messages", kind, id] as const,
    files: (kind: string, id: string, page: number) =>
      ["sms", "files", kind, id, page] as const,
    /** Prefix of a contact's files pages, whatever the page. */
    filesOf: (kind: string, id: string) => ["sms", "files", kind, id] as const,
  },
};
