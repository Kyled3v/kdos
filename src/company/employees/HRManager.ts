/**
 * HRManager
 *
 * Owns human employee lifecycle and AI employee governance — hiring,
 * onboarding, performance, and role definition alignment.
 */

import { Department, PriorityLevel } from "../ReportingStructure";
import { EmployeeDefinition } from "./CEO";

export const HR_MANAGER: EmployeeDefinition = {
  employeeId: "employee-hr-manager",
  name: "Fatima Cassim",
  title: "HR Manager",
  department: Department.HR,
  reportsTo: "employee-ceo",
  manages: [],
  primaryResponsibilities: [
    "Manage human employee hiring, onboarding, and performance review cycles",
    "Maintain accurate organisation chart and role definitions in KDOS",
    "Coordinate AI employee role scoping with the CTO before deployment",
    "Ensure workplace policy compliance with South African labour law",
  ],
  secondaryResponsibilities: [
    "Support Legal Advisor on employment contract matters",
    "Track team satisfaction and retention",
  ],
  decisionAuthority: [
    "Approval of role changes within the organisation chart",
    "Approval of onboarding and offboarding processes",
  ],
  requiredKnowledge: [
    "South African labour law (BCEA, LRA)",
    "KDOS organisation chart and reporting structure",
    "AI employee role and responsibility framework",
  ],
  requiredSkills: [
    "Human resources management",
    "Organisational design",
    "Employment law compliance",
  ],
  allowedModels: ["reasoning-tier-secondary"],
  allowedPlugins: ["workforce"],
  KPIs: [
    "Employee retention rate",
    "Time-to-hire",
    "Onboarding completion rate",
  ],
  maximumProjectValue: 0,
  maximumQuotationValue: 0,
  collaborationPartners: ["employee-ceo", "employee-cto", "employee-legal-advisor"],
  handoffTargets: ["employee-legal-advisor"],
  workingMemoryLimit: 14000,
  priorityLevel: PriorityLevel.HIGH,
};