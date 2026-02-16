import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

const Profile = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [experience, setExperience] = useState<Array<any>>([]);
  const [education, setEducation] = useState<Array<any>>([]);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      setLoading(true);
      try {
        // profiles table keyed by user_id in this app
        const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
        if (error && (error as any).code !== 'PGRST116') {
          throw error;
        }
        if (data) {
          setDisplayName((data as any).display_name ?? '');
          setResumeUrl((data as any).resume_url ?? null);
          setExperience((data as any).experience ?? []);
          setEducation((data as any).education ?? []);
          // Prefill email from auth user if available
          setEmail((user as any)?.email ?? (data as any).email ?? '');
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  // If user just signed in via LinkedIn, try to fetch profile details
  const [linkedInImported, setLinkedInImported] = useState(false);
  useEffect(() => {
    if (!session || !user || linkedInImported) return;
    // Supabase may expose provider access token on session.provider_token
    const providerToken = (session as any)?.provider_token;
    // Also ensure the identity provider is LinkedIn if available
    const isLinkedIn = (session as any)?.user?.identities?.some((id: any) => id.provider === 'linkedin');
    if (!providerToken || !isLinkedIn) return;

    const fetchLinkedIn = async () => {
      try {
        // Basic profile
        const meRes = await fetch('https://api.linkedin.com/v2/me', {
          headers: { Authorization: `Bearer ${providerToken}` },
        });
        if (!meRes.ok) throw new Error('Failed to fetch LinkedIn profile');
        const me = await meRes.json();

        // Email
        const emailRes = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
          headers: { Authorization: `Bearer ${providerToken}` },
        });
        let email = '';
        if (emailRes.ok) {
          const emailJson = await emailRes.json();
          email = emailJson?.elements?.[0]?.['handle~']?.emailAddress ?? '';
        }

        // Map fields
        const firstName = me.localizedFirstName || me.firstName?.localized?.['en_US'] || '';
        const lastName = me.localizedLastName || me.lastName?.localized?.['en_US'] || '';
        const fullName = `${firstName} ${lastName}`.trim();

        if (fullName) setDisplayName(fullName);

        // Add a lightweight experience entry if available (headline)
        const headline = (me.headline && (me.headline.localized?.['en_US'] || me.headline)) ?? '';
        if (headline) setExperience((prev) => [{ company: '', role: headline, start: '', end: '' }, ...prev]);

        setLinkedInImported(true);
        toast({ title: 'Imported from LinkedIn', description: 'We pre-filled some profile fields. Please review and save.' });
      } catch (err: any) {
        console.warn('LinkedIn import failed', err);
      }
    };

    fetchLinkedIn();
  }, [session, user, linkedInImported, toast]);

  const uploadResume = async (file: File) => {
    if (!user) return;
    setLoading(true);
    try {
      const path = `resumes/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('resumes').getPublicUrl(path);
      const url = data.publicUrl;

      // Save profile metadata (use user_id field)
      const { error: upsertError } = await supabase.from('profiles').upsert({ user_id: user.id, display_name: displayName, resume_url: url, experience, education } as any);
      if (upsertError) throw upsertError;
      setResumeUrl(url);
      toast({ title: 'Resume uploaded', description: 'Your resume has been uploaded.' });
    } catch (err: any) {
      toast({ title: 'Upload error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadResume(file);
  };

  const addExperience = () => setExperience([...experience, { company: '', role: '', start: '', end: '' }]);
  const updateExperience = (idx: number, key: string, value: string) => {
    const copy = [...experience];
    copy[idx][key] = value;
    setExperience(copy);
  };
  const removeExperience = (idx: number) => setExperience(experience.filter((_, i) => i !== idx));

  const addEducation = () => setEducation([...education, { school: '', degree: '', start: '', end: '' }]);
  const updateEducation = (idx: number, key: string, value: string) => {
    const copy = [...education];
    copy[idx][key] = value;
    setEducation(copy);
  };
  const removeEducation = (idx: number) => setEducation(education.filter((_, i) => i !== idx));

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // If email changed, update auth user first
      if (email && email !== (session as any)?.user?.email) {
        const { error: updateEmailError } = await supabase.auth.updateUser({ email });
        if (updateEmailError) throw updateEmailError;
        toast({ title: 'Email updated', description: 'We updated your authentication email. Please confirm if required.' });
      }
      const { error } = await supabase.from('profiles').upsert({ user_id: user.id, display_name: displayName, resume_url: resumeUrl, experience, education } as any);
      if (error) throw error;
      toast({ title: 'Saved', description: 'Your profile has been updated.' });
    } catch (err: any) {
      toast({ title: 'Save error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const changePassword = async () => {
    if (!user) return;
    if (!newPassword) return toast({ title: 'Password', description: 'Enter a new password', variant: 'destructive' });
    if (newPassword !== confirmPassword) return toast({ title: 'Password', description: 'Passwords do not match', variant: 'destructive' });
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password changed', description: 'Your password was updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Change password error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Please sign in to edit your profile.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
      <div className="space-y-4 bg-card p-4 rounded-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Resume</Label>
          {resumeUrl ? (
            <div className="flex items-center gap-4">
              <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View current resume</a>
              <span className="text-sm text-muted-foreground">(You can upload a new file below)</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
          )}
          <input type="file" onChange={handleFileChange} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Experience</Label>
            <Button size="sm" onClick={addExperience}>Add</Button>
          </div>
          <div className="space-y-2 mt-2">
            {experience.map((exp, idx) => (
              <div key={idx} className="p-2 border rounded">
                <Input placeholder="Company" value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} />
                <Input placeholder="Role" value={exp.role} onChange={(e) => updateExperience(idx, 'role', e.target.value)} />
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Start" value={exp.start} onChange={(e) => updateExperience(idx, 'start', e.target.value)} />
                  <Input placeholder="End" value={exp.end} onChange={(e) => updateExperience(idx, 'end', e.target.value)} />
                </div>
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="destructive" onClick={() => removeExperience(idx)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Education</Label>
            <Button size="sm" onClick={addEducation}>Add</Button>
          </div>
          <div className="space-y-2 mt-2">
            {education.map((ed, idx) => (
              <div key={idx} className="p-2 border rounded">
                <Input placeholder="School" value={ed.school} onChange={(e) => updateEducation(idx, 'school', e.target.value)} />
                <Input placeholder="Degree" value={ed.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} />
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Start" value={ed.start} onChange={(e) => updateEducation(idx, 'start', e.target.value)} />
                  <Input placeholder="End" value={ed.end} onChange={(e) => updateEducation(idx, 'end', e.target.value)} />
                </div>
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="destructive" onClick={() => removeEducation(idx)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveProfile} disabled={loading}>Save Profile</Button>
        </div>
        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold">Change Password</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 mt-2">
            <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={changePassword} disabled={loading}>Change Password</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
