import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePersistentStore, useEphemeralStore } from '../store';
import { Building2, Search, ExternalLink, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { cn } from '../utils/helpers';
import type { Organization } from '../types';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'government', label: 'Government' },
  { key: 'ngo', label: 'NGOs' },
  { key: 'international', label: 'International' },
  { key: 'youth', label: 'Youth-Focused' },
  { key: 'women', label: "Women's Health" },
];

export default function OrganisationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { organizations } = usePersistentStore();
  const { lowDataMode } = useEphemeralStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  const filteredOrgs = organizations.filter((org) => {
    const matchesCategory = selectedCategory === 'all' || org.category === selectedCategory;
    const matchesSearch = searchQuery
      ? org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = (key: string) => {
    const cat = CATEGORIES.find((c) => c.key === key);
    return cat?.label || key;
  };

  const getLocalizedDescription = (org: Organization) => {
    const lang = i18n.language;
    if (lang === 'rw' && org.descriptionKinyarwanda) return org.descriptionKinyarwanda;
    if (lang === 'fr' && org.descriptionFrench) return org.descriptionFrench;
    if (lang === 'sw' && org.descriptionSwahili) return org.descriptionSwahili;
    return org.description;
  };

  return (
    <div className="page-container">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-rm-gray-600 hover:text-rm-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Home</span>
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="section-title flex items-center gap-2 mb-0">
          <Building2 className="w-6 h-6" />
          {t('organisations.title')}
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rm-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search')}
          className="input pl-10"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
              selectedCategory === cat.key
                ? 'bg-rm-black text-white'
                : 'bg-white text-rm-gray-700'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Organizations Grid */}
      <div className="grid gap-4">
        {filteredOrgs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Building2 className="w-12 h-12 text-rm-gray-300 mx-auto mb-4" />
            <p className="text-rm-gray-500">{t('common.noResults')}</p>
          </div>
        ) : (
          filteredOrgs.map((org) => (
            <div key={org.id} className="card">
              <div className="flex items-start gap-4">
                {/* Logo */}
                {!lowDataMode && org.logo && (
                  <img
                    src={org.logo}
                    alt={org.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-rm-gray-900">{org.name}</h3>
                      <span className="inline-block mt-1 px-2 py-1 bg-rm-gray-100 text-xs text-rm-gray-600 rounded">
                        {getCategoryLabel(org.category)}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                      className="text-rm-gray-400 hover:text-rm-black"
                    >
                      {expandedOrg === org.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {expandedOrg === org.id && (
                    <div className="mt-3 pt-3 border-t border-rm-gray-100">
                      <p className="text-sm text-rm-gray-600 mb-4">
                        {getLocalizedDescription(org)}
                      </p>
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm inline-flex items-center gap-2"
                      >
                        {t('organisations.visitWebsite')}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      </div>
  );
}
