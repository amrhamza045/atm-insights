import { describe, it, expect } from "vitest";
import { pageNameOf, routeLabel, ancestorSegments, buildTrail, trailLabel } from "@/lib/routeHierarchy";
import { recordLocation, travel, travelTo, labelLocation, setPath } from "@/lib/pathTrail";

describe("routeHierarchy & pathTrail", () => {
  it("resolves page names and labels accurately", () => {
    expect(pageNameOf("/InventoryHub")).toBe("InventoryHub");
    expect(pageNameOf("/admin")).toBe("Admin");
    expect(routeLabel("InventoryHub")).toBe("Inventory");
    expect(routeLabel("Sales")).toBe("POS / Counter Sales");
  });

  it("builds full ancestor and inner trail segments with access filtering", () => {
    const canOpen = (page) => page !== "Butchery";
    const ancestors = ancestorSegments("InventoryManagement", canOpen);
    expect(ancestors.map((a) => a.label)).toEqual(["Operations", "Inventory"]);

    const segments = buildTrail({
      page: "Admin",
      pathname: "/Admin",
      reported: [
        { label: "Admin", url: "/Admin" },
        { label: "Settings", url: "/Admin?tab=branches" },
        { label: "Unit Conversions", url: "/Admin?tab=unit-conversions" },
      ],
      canOpen,
    });
    expect(trailLabel(segments)).toBe("Admin › Settings › Unit Conversions");
  });

  it("tracks session history, Back/Forward travel, and label updates", () => {
    recordLocation("/Catering", "PUSH", "Catering");
    recordLocation("/Admin?tab=roles", "PUSH", "Admin");
    labelLocation("/Admin?tab=roles", "Admin › Settings › Role Management");
    setPath("/Admin?tab=roles", [
      { label: "Admin", url: "/Admin" },
      { label: "Role Management", url: "/Admin?tab=roles" },
    ]);

    const backUrl = travel(-1);
    expect(backUrl).toBe("/Catering");
    recordLocation("/Catering", "PUSH", "Catering");

    const forwardUrl = travel(1);
    expect(forwardUrl).toBe("/Admin?tab=roles");
    recordLocation("/Admin?tab=roles", "PUSH", "Admin");
    expect(travelTo(0)).toBe("/Catering");
  });
});