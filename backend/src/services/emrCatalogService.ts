export interface EhrSystemCatalogItem {
  id: string;
  name: string;
  protocol: string;
  logoSrc: string;
}

const EHR_SYSTEM_CATALOG: EhrSystemCatalogItem[] = [
  {
    id: "epic",
    name: "Epic",
    protocol: "FHIR R4",
    logoSrc: "/images/ehr-logos/epic.png",
  },
  {
    id: "athenahealth",
    name: "Athenahealth",
    protocol: "REST API",
    logoSrc: "/images/ehr-logos/athenahealth.png",
  },
  {
    id: "eclinicalworks",
    name: "eClinicalWorks",
    protocol: "FHIR R4",
    logoSrc: "/images/ehr-logos/eclinicalworks.png",
  },
  {
    id: "oracle-health",
    name: "Cerner / Oracle Health",
    protocol: "FHIR R4",
    logoSrc: "/images/ehr-logos/oracle.png",
  },
  {
    id: "nextgen",
    name: "NextGen",
    protocol: "REST API",
    logoSrc: "/images/ehr-logos/nextgen.png",
  },
  {
    id: "drchrono",
    name: "DrChrono",
    protocol: "REST API",
    logoSrc: "/images/ehr-logos/drchrono.png",
  },
  {
    id: "tebra",
    name: "Kareo / Tebra",
    protocol: "REST API",
    logoSrc: "/images/ehr-logos/tebra.png",
  },
  {
    id: "advancedmd",
    name: "AdvancedMD",
    protocol: "FHIR STU3",
    logoSrc: "/images/ehr-logos/advancedmd.png",
  },
];

export interface EhrSystemView extends EhrSystemCatalogItem {
  isConnected: boolean;
}

export function normalizeEmrSystemKey(value?: string | null): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listEhrSystems(connectedSystem?: string | null): EhrSystemView[] {
  const normalizedConnectedSystem = normalizeEmrSystemKey(connectedSystem);

  return EHR_SYSTEM_CATALOG.map((system) => ({
    ...system,
    isConnected:
      normalizedConnectedSystem.length > 0 &&
      (normalizedConnectedSystem === system.id ||
        normalizedConnectedSystem === normalizeEmrSystemKey(system.name)),
  }));
}

export function getEhrSystemById(systemId: string): EhrSystemCatalogItem | null {
  return (
    EHR_SYSTEM_CATALOG.find((system) => system.id === systemId) ||
    EHR_SYSTEM_CATALOG.find((system) => normalizeEmrSystemKey(system.name) === systemId) ||
    null
  );
}
