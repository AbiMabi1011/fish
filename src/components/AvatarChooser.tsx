/**
 * Avatar picker dialog in the header.
 * Players can select free avatars or unlock paid avatars with coins/shells.
 */
import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/identity/AuthProvider";
import { AVATARS, type AvatarId } from "@/identity/avatars";
import { AVATAR_PRICES } from "@/game/progression";
import { useProgress } from "@/hooks/useProgress";
import { unlockAvatar } from "@/services/progressService";

export function AvatarChooser() {
  const { avatar, selectAvatar, displayName } = useAuth();
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState<AvatarId | null>(null);
  const { progress, refresh } = useProgress();

  function isOwned(id: string) {
    return !AVATAR_PRICES[id] || !!progress?.unlocked_avatars.includes(id);
  }

  async function handleChoose(id: AvatarId) {
    setSavingId(id);
    try {
      if (!isOwned(id)) {
        const price = AVATAR_PRICES[id] ?? { coins: 0, shells: 0 };
        const hasEnoughCoins = (progress?.coins ?? 0) >= price.coins;
        const hasEnoughShells = (progress?.shells ?? 0) >= price.shells;

        if (!hasEnoughCoins || !hasEnoughShells) {
          toast.error(
            "Not enough coins or seashells yet — play to earn more!",
          );
          return;
        }

        await unlockAvatar(id);
        await refresh();
        toast.success("Avatar unlocked!");
      }

      await selectAvatar(id);
      toast.success("Avatar saved");
      setOpen(false);
    } catch {
      toast.error("Couldn't save your avatar. Try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="avatar-trigger"
          aria-label="Choose your avatar"
          title="Choose your avatar"
        >
          <img src={avatar.image} alt={avatar.name} />
          <span>{displayName ?? "Your avatar"}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="avatar-dialog">
        <DialogTitle className="avatar-heading">Choose your avatar</DialogTitle>
        <DialogDescription className="text-center text-sm">
          You have {progress?.coins ?? 0} 🪙 and {progress?.shells ?? 0} 🐚.
          Locked characters can be bought.
        </DialogDescription>

        <div className="avatar-grid">
          {AVATARS.map((option) => {
            const owned = isOwned(option.id);
            const price = AVATAR_PRICES[option.id];
            const isSelected = avatar.id === option.id;
            const isSaving = savingId === option.id;

            return (
              <Button
                key={option.id}
                variant="ghost"
                disabled={savingId !== null}
                aria-label={
                  owned ? `Choose ${option.name}` : `Unlock ${option.name}`
                }
                aria-pressed={isSelected}
                onClick={() => void handleChoose(option.id)}
                className="avatar-option"
              >
                <span className="avatar-portrait">
                  <img src={option.image} alt="" />
                  {!owned && price && (
                    <span className="avatar-lock">
                      {price.coins
                        ? `${price.coins} 🪙`
                        : `${price.shells} 🐚`}
                    </span>
                  )}
                  {isSaving ? (
                    <LoaderCircle className="avatar-check animate-spin" />
                  ) : isSelected ? (
                    <Check className="avatar-check" />
                  ) : null}
                </span>
                <span className="avatar-name">{option.name}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
