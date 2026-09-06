import { basename } from "node:path";

export type ProductName = "agro" | "oh";

export interface Product {
  name: ProductName;
  bin: string;
  title: string;
  packageName: string;
}

export const AGRO_PRODUCT: Product = {
  name: "agro",
  bin: "agro",
  title: "AGRO CLI",
  packageName: "@mifune/agro",
};

export const LEGACY_PRODUCT: Product = {
  name: "oh",
  bin: "oh",
  title: "Open Harness CLI",
  packageName: "@mifune/openharness",
};

const FILE_EXTENSION = /\.[^.]*$/;

export function invokedName(argv1: string | undefined): string {
  if (argv1 === undefined) return "";
  return basename(argv1.replace(/\\/g, "/")).replace(FILE_EXTENSION, "");
}

export function resolveProduct(argv1: string | undefined): Product {
  return invokedName(argv1) === LEGACY_PRODUCT.bin ? LEGACY_PRODUCT : AGRO_PRODUCT;
}
