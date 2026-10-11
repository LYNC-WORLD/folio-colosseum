// Kept for backward compatibility — anything still importing PrimaryButton /
// GhostLink gets the new design. New code should use Button from components/ui.
import { Button } from "../ui/Button";

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return <Button title={label} onPress={onPress} disabled={disabled} />;
}

export function GhostLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button variant="link" size="sm" title={label} onPress={onPress} />;
}
