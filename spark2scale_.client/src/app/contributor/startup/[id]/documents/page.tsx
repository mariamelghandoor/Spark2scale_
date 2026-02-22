"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ContributorHeader from "@/components/contributor/ContributorHeader";

// --- Interfaces ---
interface DocumentVersion {
  vid: string;
  version_number: number;
  path: string;
  created_at: string;
  generated_by: string;
}

interface DocumentData {
  did: string;
  document_name: string;
  type: string;
  current_path: string;
  updated_at: string;
  is_current: boolean;
  versions: DocumentVersion[];
}

export default function ContributorDocumentsPage() {
  const params = useParams();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  const rawId = params?.id as string | string[] | undefined;
  const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

  // Version Selection State: { type_name: "vid_of_version" }
  const [selectedVersions, setSelectedVersions] = useState<{ [type: string]: string }>({});

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5231";

  useEffect(() => {
    if (startupId) fetchDocuments();
    else setLoading(false);
  }, [startupId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      // Clean API URL
      const cleanUrl = API_BASE_URL.replace(/\/$/, "");

      // 1. Fetch All Docs
      const res = await fetch(`${cleanUrl}/api/documents/all?startupId=${startupId}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const docs: DocumentData[] = await res.json();

      // 2. Fetch History for each
      const docsWithHistory = await Promise.all(
        docs.map(async (doc) => {
          try {
            const hRes = await fetch(`${cleanUrl}/api/documents/history/${doc.did}`);
            const history: DocumentVersion[] = hRes.ok ? await hRes.json() : [];
            return { ...doc, versions: history };
          } catch (err) {
            console.warn(`Could not load history for ${doc.did}`, err);
            return { ...doc, versions: [] };
          }
        })
      );

      // 3. GROUP BY TYPE
      const groupedDocs = processAndGroupDocuments(docsWithHistory);

      setDocuments(groupedDocs);
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- GROUPING HELPER ---
  const processAndGroupDocuments = (rawDocs: DocumentData[]): DocumentData[] => {
    const groups: Record<string, DocumentData> = {};

    rawDocs.forEach(doc => {
      const type = doc.type; // Grouping Key

      if (!groups[type]) {
        groups[type] = { ...doc, versions: [...doc.versions] };
      } else {
        groups[type].versions = [...groups[type].versions, ...doc.versions];

        if (new Date(doc.updated_at) > new Date(groups[type].updated_at)) {
          groups[type].did = doc.did;
          groups[type].document_name = doc.document_name;
          groups[type].current_path = doc.current_path;
          groups[type].updated_at = doc.updated_at;
          groups[type].is_current = doc.is_current;
        }
      }
    });

    return Object.values(groups).map(group => {
      // Sort versions by date descending
      group.versions.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Remove duplicates
      const uniqueVersions = Array.from(new Map(group.versions.map(v => [v.vid, v])).values());
      group.versions = uniqueVersions;

      return group;
    });
  };

  // --- VIEW LOGIC ---
  const handleView = (doc: DocumentData) => {
    const selectedVid = selectedVersions[doc.type];
    const specificVersion = doc.versions.find(v => v.vid === selectedVid);
    const urlToOpen = specificVersion ? specificVersion.path : doc.current_path;

    if (urlToOpen) window.open(urlToOpen, "_blank");
  };

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("pdf")) return "📄";
    if (t.includes("excel") || t.includes("financial")) return "📊";
    return "📈";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
      {/* Nav */}
      <ContributorHeader
        backLink={`/contributor/startup/${startupId}`}
        title="📁 Documents"
        subtitle="Contributor Access"
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="grid md:grid-cols-1 gap-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No documents found for this startup.</p>
              </div>
            ) : (
              documents.map((doc, index) => (
                <motion.div
                  key={doc.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 border-2 transition-all bg-white hover:border-[#FFD95D]">
                    <div className="flex flex-col md:flex-row gap-6">

                      {/* LEFT SIDE: Document Info */}
                      <div className="flex items-start gap-4 md:w-1/3">
                        <div className="text-5xl">{getIcon(doc.type)}</div>
                        <div className="flex-grow">
                          <h3 className="font-bold text-[#576238] text-lg mb-1">
                            {doc.type}
                          </h3>

                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2" title={doc.document_name}>
                              <span className="font-semibold text-gray-500">Latest File:</span>
                              <span className="truncate max-w-[150px]">{doc.document_name}</span>
                            </div>
                            <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT SIDE: Controls */}
                      <div className="md:w-2/3 space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Version History
                          </Label>
                          <Select
                            value={selectedVersions[doc.type] || "latest"}
                            onValueChange={(val) => setSelectedVersions({ ...selectedVersions, [doc.type]: val })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Latest Version" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="latest">
                                Current (Latest)
                              </SelectItem>
                              {doc.versions.map((v) => (
                                <SelectItem key={v.vid} value={v.vid}>
                                  {new Date(v.created_at).toLocaleDateString()} - Version {v.version_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleView(doc)} className="w-full md:w-auto">
                            <Eye className="h-4 w-4 mr-2" />
                            View / Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}