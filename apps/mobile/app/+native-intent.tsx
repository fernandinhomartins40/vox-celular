import { incomingLink } from '../src/incomingLink';
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return incomingLink(path);
}
