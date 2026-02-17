import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, FileText, Plus, Trash2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { RESUMES_BUCKET, getBucketNotFoundMessage, isBucketNotFoundError } from "@/lib/storage";

type ExperienceItem = {
  company: string;
  role: string;
  start: string;
  end: string;
};

type EducationItem = {
  school: string;
  degree: string;
  start: string;
  end: string;
};

const EMPTY_EXPERIENCE: ExperienceItem = { company: "", role: "", start: "", end: "" };
const EMPTY_EDUCATION: EducationItem = { school: "", degree: "", start: "", end: "" };

const getInitials = (value: string) => {
  const parts = value.split(/\s+|@|\./).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getFileNameFromPathOrUrl = (value: string) => {
  if (!value) return "";
  try {
    const path = value.startsWith("http") ? new URL(value).pathname : value;
    const last = path.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last);
  } catch {
    const last = value.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last);
  }
};

const Profile = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [parsingCv, setParsingCv] = useState(false);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => {
    const source = displayName.trim() || user?.email || "User";
    return getInitials(source);
  }, [displayName, user?.email]);

  const resolveResumeUrl = (path: string) => {
    const { data } = supabase.storage.from(RESUMES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const getLatestResumePath = async (uid: string): Promise<string | null> => {
    const folders = [uid, `resumes/${uid}`];
    let latest: { path: string; timestamp: string } | null = null;

    for (const folder of folders) {
      const { data, error } = await supabase.storage.from(RESUMES_BUCKET).list(folder, {
        limit: 100,
        sortBy: { column: "updated_at", order: "desc" },
      });

      if (error || !data) {
        if (error && isBucketNotFoundError(error)) {
          console.warn(getBucketNotFoundMessage(RESUMES_BUCKET));
          return null;
        }
        continue;
      }

      for (const item of data) {
        if (!item.name) continue;
        const path = `${folder}/${item.name}`;
        const timestamp = item.updated_at || item.created_at || "";
        if (!latest || timestamp > latest.timestamp) {
          latest = { path, timestamp };
        }
      }
    }

    return latest?.path ?? null;
  };

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
        const profile = data as unknown as
          {
              display_name?: string | null;
              resume_url?: string | null;
              experience?: ExperienceItem[] | null;
              education?: EducationItem[] | null;
              email?: string | null;
            }
          | null;

        setEmail(user.email ?? profile?.email ?? "");

        if (data) {
          setDisplayName(profile?.display_name ?? "");
          setExperience(profile?.experience ?? []);
          setEducation(profile?.education ?? []);
          if (profile?.resume_url) {
            setResumeUrl(profile.resume_url);
            setResumeFileName(getFileNameFromPathOrUrl(profile.resume_url));
          }
        }

        const hasProfileResume = Boolean(profile?.resume_url);
        if (!hasProfileResume) {
          const latestResumePath = await getLatestResumePath(user.id);
          if (latestResumePath) {
            const autoResumeUrl = resolveResumeUrl(latestResumePath);
            setResumeUrl(autoResumeUrl);
            setResumeFileName(getFileNameFromPathOrUrl(latestResumePath));
            await supabase
              .from("profiles")
              .upsert({ user_id: user.id, resume_url: autoResumeUrl } as any);
          }
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
    const isLinkedIn = (session as any)?.user?.identities?.some(
      (id: any) => id.provider === 'linkedin' || id.provider === 'linkedin_oidc'
    );
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

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For PDF files, read as text (basic extraction)
    const text = await file.text();
    // If it looks like binary/PDF, extract printable strings
    if (text.includes('%PDF')) {
      // Extract readable text segments from PDF binary
      const readable = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, ' ')
        .trim();
      return readable.slice(0, 15000); // limit context size
    }
    return text.slice(0, 15000);
  };

  const parseCvWithAI = async (file: File) => {
    setParsingCv(true);
    try {
      const resumeText = await extractTextFromFile(file);
      if (resumeText.trim().length < 50) {
        toast({ title: 'Could not extract text', description: 'The CV text could not be read. Please fill in the fields manually.', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('parse-cv', {
        body: { resumeText },
      });

      if (error) throw error;

      if (data?.experience?.length) {
        setExperience(data.experience);
      }
      if (data?.education?.length) {
        setEducation(data.education);
      }

      if (data?.experience?.length || data?.education?.length) {
        toast({ title: 'CV parsed!', description: 'Education and experience have been autofilled. Review and save your profile.' });
      } else {
        toast({ title: 'No data extracted', description: 'Could not extract education or experience. You can fill them in manually.' });
      }
    } catch (err: any) {
      console.error('CV parse error:', err);
      toast({ title: 'CV parsing failed', description: err.message || 'Could not parse CV. Fill in fields manually.', variant: 'destructive' });
    } finally {
      setParsingCv(false);
    }
  };

  const uploadResume = async (file: File) => {
    if (!user) return;
    const lowerName = file.name.toLowerCase();
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".doc", ".docx"];

    const hasAllowedMime = allowedMimeTypes.includes(file.type);
    const hasAllowedExtension = allowedExtensions.some((ext) => lowerName.endsWith(ext));
    if (!hasAllowedMime && !hasAllowedExtension) {
      toast({
        title: "Unsupported file",
        description: "Upload a PDF, DOC, or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please upload a file smaller than ${maxSizeMb}MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploadingResume(true);
    try {
      const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(RESUMES_BUCKET).upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;
      const url = resolveResumeUrl(path);

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, display_name: displayName, resume_url: url, experience, education } as any);
      if (upsertError) throw upsertError;
      setResumeUrl(url);
      setResumeFileName(safeName);
      toast({ title: 'Resume uploaded', description: 'Parsing your CV to autofill profile...' });

      // Trigger AI parsing
      void parseCvWithAI(file);
    } catch (err: any) {
      const description = isBucketNotFoundError(err) ? getBucketNotFoundMessage(RESUMES_BUCKET) : err.message;
      toast({ title: 'Upload error', description, variant: 'destructive' });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void uploadResume(file);
    e.target.value = "";
  };

  const addExperience = () => setExperience([...experience, { ...EMPTY_EXPERIENCE }]);
  const updateExperience = (idx: number, key: string, value: string) => {
    const copy = [...experience];
    copy[idx] = { ...copy[idx], [key]: value } as ExperienceItem;
    setExperience(copy);
  };
  const removeExperience = (idx: number) => setExperience(experience.filter((_, i) => i !== idx));

  const addEducation = () => setEducation([...education, { ...EMPTY_EDUCATION }]);
  const updateEducation = (idx: number, key: string, value: string) => {
    const copy = [...education];
    copy[idx] = { ...copy[idx], [key]: value } as EducationItem;
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="p-0">
              <div className="bg-gradient-to-r from-primary/12 via-primary/5 to-transparent px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-background shadow-sm">
                    <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
                      <Link to="/">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                      </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Profile Settings</h1>
                    <p className="text-sm text-muted-foreground">Manage your account, resume, and professional details.</p>
                  </div>
                </div>
              <Button onClick={saveProfile} disabled={loading || uploadingResume}>
                {(loading || uploadingResume) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Keep your public profile and sign-in email up to date.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                    id="profile-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resume / CV</CardTitle>
                <CardDescription>Upload your latest CV. It uploads immediately after file selection.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="w-4 h-4 text-primary" />
                        <span>{resumeUrl ? "Resume on file" : "No resume uploaded yet"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {resumeFileName || "Accepted formats: PDF, DOC, DOCX (max 10MB)"}
                      </p>
                      {resumeUrl && (
                        <a href={resumeUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">
                          View current resume
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={resumeInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={uploadingResume}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => resumeInputRef.current?.click()}
                        disabled={uploadingResume}
                      >
                        {uploadingResume ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        {uploadingResume ? "Uploading..." : "Choose CV"}
                      </Button>
                    </div>
                  </div>
                </div>
                {parsingCv && (
                  <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-primary">Parsing your CV with AI to autofill education & experience...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Experience</CardTitle>
                  <CardDescription>Add your recent roles to enrich your profile.</CardDescription>
                </div>
                <Button type="button" size="sm" onClick={addExperience}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {experience.length === 0 && (
                  <p className="text-sm text-muted-foreground">No experience entries yet.</p>
                )}
                {experience.map((exp, idx) => (
                  <div key={`${idx}-${exp.company}-${exp.role}`} className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) => updateExperience(idx, "company", e.target.value)}
                      />
                      <Input
                        placeholder="Role"
                        value={exp.role}
                        onChange={(e) => updateExperience(idx, "role", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`experience-start-${idx}`}>Start date</Label>
                        <Input
                          id={`experience-start-${idx}`}
                          type="date"
                          value={exp.start}
                          onChange={(e) => updateExperience(idx, "start", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`experience-end-${idx}`}>End date</Label>
                        <Input
                          id={`experience-end-${idx}`}
                          type="date"
                          value={exp.end}
                          onChange={(e) => updateExperience(idx, "end", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeExperience(idx)}>
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Education</CardTitle>
                  <CardDescription>Add schools and degrees to complete your profile.</CardDescription>
                </div>
                <Button type="button" size="sm" onClick={addEducation}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {education.length === 0 && (
                  <p className="text-sm text-muted-foreground">No education entries yet.</p>
                )}
                {education.map((ed, idx) => (
                  <div key={`${idx}-${ed.school}-${ed.degree}`} className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        placeholder="School"
                        value={ed.school}
                        onChange={(e) => updateEducation(idx, "school", e.target.value)}
                      />
                      <Input
                        placeholder="Degree"
                        value={ed.degree}
                        onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`education-start-${idx}`}>Start date</Label>
                        <Input
                          id={`education-start-${idx}`}
                          type="date"
                          value={ed.start}
                          onChange={(e) => updateEducation(idx, "start", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`education-end-${idx}`}>End date</Label>
                        <Input
                          id={`education-end-${idx}`}
                          type="date"
                          value={ed.end}
                          onChange={(e) => updateEducation(idx, "end", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeEducation(idx)}>
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Account Security
                </CardTitle>
                <CardDescription>Set a new password to keep your account secure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={changePassword} disabled={loading || uploadingResume} className="w-full">
                  {(loading || uploadingResume) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Change Password
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Checklist</CardTitle>
                <CardDescription>Quick view of profile completeness.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Display name</span>
                  <span className={displayName ? "text-foreground font-medium" : "text-muted-foreground"}>{displayName ? "Added" : "Missing"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Resume</span>
                  <span className={resumeUrl ? "text-foreground font-medium" : "text-muted-foreground"}>{resumeUrl ? "Uploaded" : "Missing"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Experience entries</span>
                  <span className="text-foreground font-medium">{experience.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Education entries</span>
                  <span className="text-foreground font-medium">{education.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
