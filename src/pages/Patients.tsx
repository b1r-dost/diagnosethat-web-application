import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, User, Calendar, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_ref: string;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function Patients() {
  const { t, language } = useI18n();
  const { user, isLoading: authLoading, isDentist } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, authLoading, navigate]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPatients = useCallback(async () => {
    if (!user || !isDentist) return;
    
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' });

      // Server-side search
      if (debouncedSearch.trim()) {
        const searchTerm = `%${debouncedSearch.trim()}%`;
        query = query.or(
          `first_name.ilike.${searchTerm},` +
          `last_name.ilike.${searchTerm},` +
          `patient_ref.ilike.${searchTerm},` +
          `phone.ilike.${searchTerm}`
        );
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching patients:', error);
        return;
      }

      setPatients(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isDentist, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isDentist) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">
            {language === 'tr' ? 'Bu sayfaya erişim yetkiniz yok.' : 'You do not have access to this page.'}
          </p>
        </div>
      </MainLayout>
    );
  }

  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">{t.patients.title}</h1>
          <Button onClick={() => navigate('/patients/new')} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            {t.patients.addNew}
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.patients.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results count */}
        {!isLoading && totalCount > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'tr' 
              ? `${totalCount} hastadan ${showingFrom}-${showingTo} arası gösteriliyor`
              : `Showing ${showingFrom}-${showingTo} of ${totalCount} patients`
            }
          </p>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t.patients.noPatients}</p>
              <Button 
                onClick={() => navigate('/patients/new')} 
                variant="outline" 
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.patients.addNew}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {patients.map(patient => (
                <Card 
                  key={patient.id} 
                  className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <User className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {patient.first_name} {patient.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{patient.patient_ref}</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
                        {patient.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{patient.phone}</span>
                          </div>
                        )}
                        {patient.birth_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(patient.birth_date), 'dd.MM.yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
