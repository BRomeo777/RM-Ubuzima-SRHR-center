import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistentStore, useEphemeralStore } from '../store';
import { Search, BookOpen, ChevronRight, FileText, Image, Video, X, Play } from 'lucide-react';
import { cn } from '../utils/helpers';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';
import { useSearchParams } from 'react-router-dom';

export default function SRHRInfoPage() {
  const { t, i18n } = useTranslation();
  const { topics, articles } = usePersistentStore();
  const { lowDataMode } = useEphemeralStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Handle article ID from URL query parameter (from notifications)
  useEffect(() => {
    const articleId = searchParams.get('article');
    if (articleId) {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        setSelectedArticle(articleId);
        setSelectedTopic(article.topicId);
        // Clear the query parameter after opening
        searchParams.delete('article');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, articles, setSearchParams]);

  // Phone back navigation for modals
  usePhoneBackNavigation({
    isOpen: !!selectedArticle,
    onClose: () => setSelectedArticle(null),
    modalId: 'srhr-article'
  });

  usePhoneBackNavigation({
    isOpen: !!selectedImage,
    onClose: () => setSelectedImage(null),
    modalId: 'srhr-image'
  });

  usePhoneBackNavigation({
    isOpen: !!selectedVideo,
    onClose: () => setSelectedVideo(null),
    modalId: 'srhr-video'
  });

  const filteredArticles = articles.filter((article) => {
    const matchesTopic = selectedTopic ? article.topicId === selectedTopic : true;
    const matchesSearch = searchQuery
      ? article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.titleKinyarwanda?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (article.titleFrench?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (article.titleSwahili?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesTopic && matchesSearch;
  });

  const currentArticle = selectedArticle
    ? articles.find((a) => a.id === selectedArticle)
    : null;

  // Get content based on language
  const getArticleContent = (article: typeof articles[0]) => {
    const lang = i18n.language;
    let title = article.title;
    let content = article.content;

    if (lang === 'rw' && article.titleKinyarwanda && article.contentKinyarwanda) {
      title = article.titleKinyarwanda;
      content = article.contentKinyarwanda;
    } else if (lang === 'fr' && article.titleFrench && article.contentFrench) {
      title = article.titleFrench;
      content = article.contentFrench;
    } else if (lang === 'sw' && article.titleSwahili && article.contentSwahili) {
      title = article.titleSwahili;
      content = article.contentSwahili;
    }

    return { title, content };
  };

  const getTopicName = (topic: typeof topics[0]) => {
    const lang = i18n.language;
    if (lang === 'rw' && topic.nameKinyarwanda) return topic.nameKinyarwanda;
    if (lang === 'fr' && topic.nameFrench) return topic.nameFrench;
    if (lang === 'sw' && topic.nameSwahili) return topic.nameSwahili;
    return topic.name;
  };

  // Check if URL is an embeddable video platform
  const isEmbeddableVideo = (url: string) => {
    return url.includes('youtube.com') || 
           url.includes('youtu.be') ||
           url.includes('vimeo.com') ||
           url.includes('dailymotion.com') ||
           url.includes('tiktok.com');
  };

  // Get embed URL for video platforms
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/') + '?autoplay=1';
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/') + '?autoplay=1';
    }
    if (url.includes('vimeo.com')) {
      const vimeoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }
    if (url.includes('dailymotion.com')) {
      const videoId = url.split('/').pop()?.split('_')[0];
      return `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1`;
    }
    return url;
  };

  if (currentArticle) {
    const { title, content } = getArticleContent(currentArticle);

    return (
      <div className="page-container">
        <button
          onClick={() => setSelectedArticle(null)}
          className="btn-secondary mb-4"
        >
          ← {t('common.back')}
        </button>

        <article className="bg-white rounded-xl p-6">
          <h1 className="text-2xl font-bold text-rm-gray-900 mb-4">{title}</h1>
          
          {/* Full Image Display with Click to View */}
          {!lowDataMode && currentArticle.images.length > 0 && (
            <div className="space-y-4 mb-6">
              {currentArticle.images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="relative cursor-pointer group"
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img}
                    alt={`${title} - ${idx + 1}`}
                    className="rounded-lg w-full h-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                </div>
              ))}
            </div>
          )}

          <div 
            className="prose prose-gray max-w-none srhr-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Videos with Click to Play */}
          {currentArticle.videos.length > 0 && (
            <div className="mt-6 space-y-4">
              {currentArticle.videos.map((video, idx) => (
                <div 
                  key={idx} 
                  className="relative aspect-video rounded-lg overflow-hidden bg-rm-gray-100 cursor-pointer group"
                  onClick={() => setSelectedVideo(video)}
                >
                  {/* Video Thumbnail/Placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-rm-black ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                      {video.includes('youtube') ? 'YouTube' : 
                       video.includes('vimeo') ? 'Vimeo' : 
                       video.includes('dailymotion') ? 'Dailymotion' : 'Video'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* Full Image Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={selectedImage} 
              alt="Full view" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Video Player Modal */}
        {selectedVideo && (
          <div 
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setSelectedVideo(null)}
          >
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="w-full max-w-4xl p-4" onClick={(e) => e.stopPropagation()}>
              {isEmbeddableVideo(selectedVideo) ? (
                <div className="aspect-video w-full rounded-lg overflow-hidden">
                  <iframe
                    src={getEmbedUrl(selectedVideo)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video 
                  src={selectedVideo} 
                  controls 
                  autoPlay 
                  playsInline
                  className="w-full rounded-lg max-h-[80vh]" 
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="section-title flex items-center gap-2 mb-0">
          <BookOpen className="w-6 h-6" />
          {t('common.srhrInfo')}
        </h1>

      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rm-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('srhr.searchPlaceholder')}
          className="input pl-10"
        />
      </div>

      {/* Topic Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
        <button
          onClick={() => setSelectedTopic(null)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
            selectedTopic === null
              ? 'bg-rm-black text-white'
              : 'bg-white text-rm-gray-700'
          )}
        >
          {t('common.all')}
        </button>
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => setSelectedTopic(topic.id)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
              selectedTopic === topic.id
                ? 'bg-rm-black text-white'
                : 'bg-white text-rm-gray-700'
            )}
          >
            {getTopicName(topic)}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid gap-4">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <FileText className="w-12 h-12 text-rm-gray-300 mx-auto mb-4" />
            <p className="text-rm-gray-500">{t('srhr.noArticles')}</p>
          </div>
        ) : (
          filteredArticles.map((article) => {
            const { title } = getArticleContent(article);
            return (
              <div
                key={article.id}
                onClick={() => setSelectedArticle(article.id)}
                className="card cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-rm-gray-900 mb-1 group-hover:text-rm-black">
                      {title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-rm-gray-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {article.content.length > 500 ? 'Long read' : 'Quick read'}
                      </span>
                      {!lowDataMode && article.images.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Image className="w-3 h-3" />
                          {article.images.length}
                        </span>
                      )}
                      {article.videos.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {article.videos.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-rm-gray-300 group-hover:text-rm-black" />
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
