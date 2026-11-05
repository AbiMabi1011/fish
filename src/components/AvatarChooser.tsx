import { useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/identity/AuthProvider';
import { AVATARS, type AvatarId } from '@/identity/avatars';
import { AVATAR_PRICES } from '@/game/progression';
import { useProgress } from '@/hooks/useProgress';
import { unlockAvatar } from '@/services/progressService';

export function AvatarChooser() {
  const { avatar, selectAvatar, displayName } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<AvatarId | null>(null);
  const { progress, refresh } = useProgress();
  const owned = (id: string) => !AVATAR_PRICES[id] || !!progress?.unlocked_avatars.includes(id);
  const choose = async (id: AvatarId) => {
    setSaving(id);
    try {
      if (!owned(id)) {
        const p = AVATAR_PRICES[id] ?? { coins: 0, shells: 0 };
        if ((progress?.coins ?? 0) < p.coins || (progress?.shells ?? 0) < p.shells) { toast.error('Not enough coins or seashells yet — play to earn more!'); return; }
        await unlockAvatar(id); await refresh(); toast.success('Avatar unlocked!');
      }
      await selectAvatar(id); toast.success('Avatar saved'); setOpen(false);
    }
    catch { toast.error("Couldn't save your avatar. Try again."); }
    finally { setSaving(null); }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="ghost" className="avatar-trigger" aria-label="Choose your avatar" title="Choose your avatar"><img src={avatar.image} alt={avatar.name} /><span>{displayName ?? 'Your avatar'}</span></Button></DialogTrigger>
    <DialogContent className="avatar-dialog">
      <DialogTitle className="avatar-heading">Choose your avatar</DialogTitle>
      <DialogDescription className="text-center text-sm">You have {progress?.coins ?? 0} 🪙 and {progress?.shells ?? 0} 🐚. Locked characters can be bought.</DialogDescription>
      <div className="avatar-grid">
        {AVATARS.map((option) => <Button key={option.id} variant="ghost" disabled={saving !== null} aria-label={owned(option.id) ? `Choose ${option.name}` : `Unlock ${option.name}`} aria-pressed={avatar.id === option.id} onClick={() => void choose(option.id)} className="avatar-option">
          <span className="avatar-portrait"><img src={option.image} alt="" />{!owned(option.id) && <span className="avatar-lock">{AVATAR_PRICES[option.id]?.coins ? `${AVATAR_PRICES[option.id]?.coins} 🪙` : `${AVATAR_PRICES[option.id]?.shells} 🐚`}</span>}{saving === option.id ? <LoaderCircle className="avatar-check animate-spin" /> : avatar.id === option.id ? <Check className="avatar-check" /> : null}</span>
          <span className="avatar-name">{option.name}</span>
        </Button>)}
      </div>
    </DialogContent>
  </Dialog>;
}