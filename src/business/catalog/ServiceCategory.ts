/**
 * ServiceCategory
 *
 * Enumerates the commercial groupings under which KyleDev sells services.
 * Used by ServicePackage for classification and by ServiceRecommendation
 * for industry-to-category matching. Pure data shape only.
 */

export enum ServiceCategory {
  WEB_DEVELOPMENT = "WEB_DEVELOPMENT",
  ECOMMERCE = "ECOMMERCE",
  CUSTOM_SOFTWARE = "CUSTOM_SOFTWARE",
  MOBILE_APPLICATIONS = "MOBILE_APPLICATIONS",
  BUSINESS_SYSTEMS = "BUSINESS_SYSTEMS",
  INDUSTRY_SOLUTIONS = "INDUSTRY_SOLUTIONS",
  AUTOMATION_AND_AI = "AUTOMATION_AND_AI",
  BRANDING_AND_MARKETING = "BRANDING_AND_MARKETING",
  INFRASTRUCTURE_AND_HOSTING = "INFRASTRUCTURE_AND_HOSTING",
  SECURITY_AND_COMPLIANCE = "SECURITY_AND_COMPLIANCE",
  DATA_AND_INTELLIGENCE = "DATA_AND_INTELLIGENCE",
  AI_WORKFORCE = "AI_WORKFORCE",
  KDOS_SERVICES = "KDOS_SERVICES",
}

export const SERVICE_CATEGORY_LABELS: Readonly<Record<ServiceCategory, string>> = {
  [ServiceCategory.WEB_DEVELOPMENT]: "Web Development",
  [ServiceCategory.ECOMMERCE]: "E-commerce",
  [ServiceCategory.CUSTOM_SOFTWARE]: "Custom Software",
  [ServiceCategory.MOBILE_APPLICATIONS]: "Mobile Applications",
  [ServiceCategory.BUSINESS_SYSTEMS]: "Business Systems",
  [ServiceCategory.INDUSTRY_SOLUTIONS]: "Industry Solutions",
  [ServiceCategory.AUTOMATION_AND_AI]: "Automation & AI",
  [ServiceCategory.BRANDING_AND_MARKETING]: "Branding & Marketing",
  [ServiceCategory.INFRASTRUCTURE_AND_HOSTING]: "Infrastructure & Hosting",
  [ServiceCategory.SECURITY_AND_COMPLIANCE]: "Security & Compliance",
  [ServiceCategory.DATA_AND_INTELLIGENCE]: "Data & Intelligence",
  [ServiceCategory.AI_WORKFORCE]: "AI Workforce",
  [ServiceCategory.KDOS_SERVICES]: "KDOS Services",
};