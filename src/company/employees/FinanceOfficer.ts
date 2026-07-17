/**
 * FinanceOfficer
 *
 * Owns KyleDev's financial operations — invoicing, VAT compliance,
 * cash flow, and financial reporting to the CEO.
 */

import { Department, PriorityLevel } from "../ReportingStructure";
import { EmployeeDefinition } from "./CEO";

export const FINANCE_OFFICER: EmployeeDefinition = {
  employeeId: "employee-finance-officer",
  name: "Willem Botha",
  title: "Finance Officer",
  department: Department.FINANCE,
  reportsTo: "employee-ceo",
  manages: [],
  primaryResponsibilities: [
    "Issue and track invoices against accepted quotations and retainers",
    "Ensure 15% VAT compliance on all invoicing and reporting",
    "Monitor cash flow, outstanding receivables, and payment terms",
    "Prepare monthly and quarterly financial reports for the CEO",
  ],
  secondaryResponsibilities: [
    "Reconcile subscription and retainer billing cycles",
    "Support pricing strategy reviews with margin analysis",
  ],
  decisionAuthority: [
    "Approval of invoice terms and payment plans within standard policy",
    "Escalation authority on overdue accounts",
  ],
  requiredKnowledge: [
    "South African VAT and tax compliance requirements",
    "KDOS Invoice and Subscription domain models",
    "Company financial position and margin structure",
  ],
  requiredSkills: [
    "Financial reporting",
    "Accounts receivable management",
    "Regulatory compliance (VAT/SARS)",
  ],
  allowedModels: ["deterministic-only"],
  allowedPlugins: ["finance", "quotation"],
  KPIs: [
    "Days sales outstanding",
    "Invoice accuracy rate",
    "On-time financial reporting delivery",
  ],
  maximumProjectValue: 0,
  maximumQuotationValue: 0,
  collaborationPartners: ["employee-ceo", "employee-quotation-specialist"],
  handoffTargets: ["employee-legal-advisor"],
  workingMemoryLimit: 16000,
  priorityLevel: PriorityLevel.CRITICAL,
};