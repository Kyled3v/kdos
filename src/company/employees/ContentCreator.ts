/**
 * ContentCreator
 *
 * Produces written and visual content supporting marketing campaigns,
 * client SEO/content retainers, and brand identity deliverables.
 */

import { Department, PriorityLevel } from "../ReportingStructure";
import { EmployeeDefinition } from "./CEO";

export const CONTENT_CREATOR: EmployeeDefinition = {
  employeeId: "employee-content-creator",
  name: "Aisha Patel",
  title: "Content Creator",
  department: Department.MARKETING,
  reportsTo: "employee-marketing-director",
  manages: [],
  primaryResponsibilities: [
    "Produce blog, website, and campaign copy aligned to client brand voice",
    "Support Advanced SEO retainer content calendars",
    "Create supporting visual assets for brand identity deliverables",
    "Draft KyleDev's own marketing and case study content",
  ],
  secondaryResponsibilities: [
    "Maintain a content style guide per active client",
    "Coordinate with the SEO Specialist on keyword-targeted content",
  ],
  decisionAuthority: [
    "Content structure and drafting decisions within brand guidelines",
  ],
  requiredKnowledge: [
    "Brand voice and messaging guidelines per client",
    "Content marketing best practices",
    "Basic on-page SEO writing principles",
  ],
  requiredSkills: [
    "Copywriting",
    "Content strategy",
    "Visual asset creation",
  ],
  allowedModels: ["reasoning-tier-secondary"],
  allowedPlugins: ["marketing"],
  KPIs: [
    "Content pieces published per month",
    "Content engagement metrics",
    "Client content approval turnaround time",
  ],
  maximumProjectValue: 0,
  maximumQuotationValue: 0,
  collaborationPartners: ["employee-seo-specialist", "employee-marketing-director"],
  handoffTargets: ["employee-marketing-director"],
  workingMemoryLimit: 12000,
  priorityLevel: PriorityLevel.STANDARD,
};