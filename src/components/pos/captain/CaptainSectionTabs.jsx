import React from "react";
import { Button } from "@/components/ui/button";

export default function CaptainSectionTabs({ menuSections, selectedSection, onSelect }) {
  return (
    <div className="sticky top-16 z-40 bg-white shadow-md border-b border-slate-200 pb-4 mb-4 -mx-4 px-4 pt-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {menuSections.map(section => (
          <Button
            key={section.id}
            variant={selectedSection === section.id ? "default" : "outline"}
            onClick={() => onSelect(section.id)}
            size="sm"
            className={selectedSection === section.id ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            {section.name}
          </Button>
        ))}
        <Button
          variant={selectedSection === "all" ? "default" : "outline"}
          onClick={() => onSelect("all")}
          size="sm"
          className={selectedSection === "all" ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          All Menu
        </Button>
      </div>
    </div>
  );
}