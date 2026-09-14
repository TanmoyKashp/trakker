import applications from "../../data/applications.json";
import applicationTemplate from "../../data/application-template.json";
import tree from "../../data/application-tree.json";
import coreAssets from "../../data/core-assets.json";
import type { ReferenceData } from "../types";

export const bundledReferenceData: ReferenceData = {
  applications: applications as ReferenceData["applications"],
  applicationTemplate: applicationTemplate as ReferenceData["applicationTemplate"],
  tree: tree as ReferenceData["tree"],
  coreAssets: coreAssets as ReferenceData["coreAssets"],
};

export async function loadReferenceData(): Promise<{ data: ReferenceData; offline: boolean; error?: string }> {
  try {
    const [apps, template, treeData, assets] = await Promise.all([
      fetch("/data/applications.json").then((res) => res.json()),
      fetch("/data/application-template.json").then((res) => res.json()),
      fetch("/data/application-tree.json").then((res) => res.json()),
      fetch("/data/core-assets.json").then((res) => res.json()),
    ]);
    return { data: { applications: apps, applicationTemplate: template, tree: treeData, coreAssets: assets }, offline: false };
  } catch (error) {
    return {
      data: bundledReferenceData,
      offline: true,
      error: error instanceof Error ? error.message : "Could not refresh application data.",
    };
  }
}
