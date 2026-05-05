export const parseOtpUri = (uri: string): { issuer?: string; account?: string; secret: string | null } => {
  const url = new URL(uri);

  const secret = url.searchParams.get("secret");
  const issuer = url.searchParams.get("issuer");

  const label = decodeURIComponent(url.pathname.slice(1));
  const parts = label.split(":");

  let account: string | undefined;
  let issuerFromLabel: string | undefined;

  if (parts.length > 1) {
    issuerFromLabel = parts[0];
    account = parts.slice(1).join(":");
  } else {
    account = parts[0];
  }

  return {
    issuer: issuer || issuerFromLabel,
    account,
    secret,
  };
};
