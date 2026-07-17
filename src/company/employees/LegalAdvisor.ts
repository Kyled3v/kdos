/**
 * LegalAdvisor
 *
 * Reviews contracts, terms, and compliance matters for KyleDev and its
 * client engagements.
 */

import { Department, PriorityLevel } from "../ReportingStructure";
import { EmployeeDefinition } from "./CEO";

export const LEGAL_ADVISOR: EmployeeDefinition = {
  employeeId: "employee-legal-advisor",
  name: "Advocate Precious Mahlangu",
  title: "Legal Advisor",
  department: Department.LEGAL,
  reportsTo: "employee-ceo",
  manages: [],
  primaryResponsibilities: [
    "Review and approve client contracts before signature",
    "Ensure engagements comply with POPIA and relevant South African law",
    "Advise on liability terms within proposals and quotations",
    "Maintain standard contract and terms-of-service templates",
  ],
  secondaryResponsibilities: [
    "Support security audit engagements with POPIA compliance review",
    "Advise HR on employment-related compliance matters",
  ],
  decisionAuthority: [
    "Approval or rejection of non-standard contract terms",
    "Escalation authority on legal risk exposure",
  ],
  requiredKnowledge: [
    "South African contract and consumer protection law",
    "POPIA data protection requirements",
    "KyleDev standard terms of service",
  ],
  requiredSkills: [
    "Contract review",
    "Regulatory compliance analysis",
    "Risk assessment",
  ],
  allowedModels: ["reasoning-tier-primary"],
  allowedPlugins: ["crm", "quotation"],
  KPIs: [
    "Contract review turnaround time",
    "Compliance incidents (target: zero)",
    "Contract dispute rate",
  ],
  maximumProjectValue: 0,
  maximumQuotationValue: 0,
  collaborationPartners: ["employee-ceo", "employee-finance-officer"],
  handoffTargets: ["employee-ceo"],
  workingMemoryLimit: 16000,
  priorityLevel: PriorityLevel.HIGH,
};