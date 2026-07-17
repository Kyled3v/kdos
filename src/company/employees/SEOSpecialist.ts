/**
 * SEOSpecialist
 *
 * Delivers SEO and Google Business Optimisation services to clients, and
 * maintains KyleDev's own organic search presence.
 */

import { Department, PriorityLevel } from "../ReportingStructure";
import { EmployeeDefinition } from "./CEO";

export const SEO_SPECIALIST: EmployeeDefinition = {
  employeeId: "employee-seo-specialist",
  name: "Wandile Buthelezi",
  title: "SEO Specialist",
  department: Department.MARKETING,
  reportsTo: "employee-marketing-director",
  manages: [],
  primaryResponsibilities: [
    "Deliver SEO Starter and Advanced SEO engagements for clients",
    "Perform keyword research, technical SEO audits, and on-page optimisation",
    "Set up and optimise client Google Business Profiles",
    "Produce monthly ranking and traffic performance reports for retainer clients",
  ],
  secondaryResponsibilities: [
    "Maintain KyleDev's own website SEO performance",
    "Monitor algorithm changes affecting client rankings",
  ],
  decisionAuthority: [
    "Technical SEO implementation decisions within a client engagement",
    "Keyword targeting strategy per client",
  ],
  requiredKnowledge: [
    "Search engine ranking factors and algorithm behaviour",
    "Technical SEO auditing tools and methodology",
    "Local SEO and Google Business Profile optimisation",
  ],
  requiredSkills: [
    "Keyword research",
    "Technical SEO auditing",
    "Performance reporting",
  ],
  allowedModels: ["reasoning-tier-secondary"],
  allowedPlugins: ["marketing", "analytics"],
  KPIs: [
    "Client keyword ranking improvement",
    "Organic traffic growth",
    "SEO retainer client retention rate",
  ],
  maximumProjectValue: 0,
  maximumQuotationValue: 0,
  collaborationPartners: ["employee-marketing-director", "employee-content-creator"],
  handoffTargets: ["employee-customer-success-manager"],
  workingMemoryLimit: 14000,
  priorityLevel: PriorityLevel.STANDARD,
};