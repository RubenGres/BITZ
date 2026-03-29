'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import { API_URL } from '@/app/Constants';
import { getUserId } from '../User';

const PER_PAGE = 20;

export default function QuestListPage() {
  const [quests, setQuests] = useState<[string, any][]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'others'>('my');
  const [userId, setUserId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Sentinel ref for IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fetch a single page and append results
  const fetchPage = useCallback(
    async (tab: 'my' | 'others', pageNum: number, append: boolean) => {
      if (!append) setInitialLoading(true);
      setLoading(true);
      setError(null);

      const currentUserId = userId ?? getUserId();

      const params = new URLSearchParams({
        page: String(pageNum),
        per_page: String(PER_PAGE),
        order: 'desc',
      });

      if (tab === 'my' && currentUserId) {
        params.set('user_id', currentUserId);
      } else if (tab === 'others' && currentUserId) {
        params.set('others', currentUserId);
      }

      try {
        const response = await fetch(
          `${API_URL}/quest_list_paginated?${params.toString()}`
        );
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        if (!data || !data.quests) {
          throw new Error('Invalid data structure for quest list');
        }

        const newEntries = Object.entries(data.quests).sort(
          ([, a]: any, [, b]: any) => {
            const dateA = a.date_time ? new Date(a.date_time).getTime() : 0;
            const dateB = b.date_time ? new Date(b.date_time).getTime() : 0;
            return dateB - dateA;
          }
        );

        if (append) {
          setQuests((prev) => [...prev, ...newEntries]);
        } else {
          setQuests(newEntries);
        }

        const pagination = data.pagination;
        if (pagination) {
          setHasMore(pageNum < pagination.total_pages);
        } else {
          setHasMore(newEntries.length === PER_PAGE);
        }
      } catch (err: any) {
        console.error('Error fetching quest list:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [userId]
  );

  // Initialize user id
  useEffect(() => {
    setUserId(getUserId());
  }, []);

  // Initial load & tab switch: reset and fetch page 1
  useEffect(() => {
    if (userId !== null) {
      setQuests([]);
      setPage(1);
      setHasMore(true);
      fetchPage(activeTab, 1, false);
    }
  }, [activeTab, userId, fetchPage]);

  // When page increments beyond 1, fetch the next page and append
  useEffect(() => {
    if (userId !== null && page > 1) {
      fetchPage(activeTab, page, true);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver: trigger next page when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // Tab switch resets everything
  const handleTabChange = (tab: 'my' | 'others') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  // Format helpers
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // Tabs
  const renderTabs = () => (
    <div className="flex mb-6 border-b border-green-300">
      <button
        className={`py-2 px-6 font-semibold ${
          activeTab === 'my'
            ? 'text-green-600 border-b-2 border-green-500 bg-green-50'
            : 'text-gray-600 hover:text-green-600'
        }`}
        onClick={() => handleTabChange('my')}
      >
        MY QUESTS
      </button>
      <div className="flex-grow border-b border-green-300"></div>
    </div>
  );

  // Quest list
  const renderQuestList = () => {
    if (initialLoading) {
      return <div className="text-center p-8">Loading...</div>;
    }

    if (error && quests.length === 0) {
      return (
        <div className="text-center p-8 text-red-500">Error: {error}</div>
      );
    }

    if (quests.length === 0) {
      return (
        <div className="text-center p-8 text-gray-600">
          {activeTab === 'my'
            ? "You haven't created any quests yet."
            : 'No quests from other users available.'}
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quests.map(([quest_id, metadata]) => (
            <a
              key={quest_id}
              href={`/view?id=${quest_id}`}
              className="block p-4 bg-white shadow hover:shadow-md transition-shadow border border-green-300 hover:border-green-500"
            >
              <div className="font-semibold text-green-700 text-lg mb-1">
                {metadata.location
                  ? metadata.location.split(', ')[0] +
                    ', ' +
                    metadata.location.split(', ').slice(-1)[0]
                  : 'Unknown location'}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">
                    {metadata.date_time
                      ? formatDate(metadata.date_time)
                      : 'Date unknown'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600">
                    {metadata.flavor || 'No flavor'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600">
                    {metadata.nb_images
                      ? `${metadata.nb_images} images`
                      : 'No images'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600">
                    {metadata.species_count
                      ? `${metadata.species_count} species`
                      : 'No species'}
                  </span>
                </div>

                {metadata.taxonomic_groups &&
                  Object.keys(metadata.taxonomic_groups).length > 0 && (
                    <div className="col-span-2">
                      <div className="text-green-600 font-medium mb-1">
                        Taxonomic Groups
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(metadata.taxonomic_groups).map(
                          ([group, count]) => (
                            <div
                              key={group}
                              className="text-sm bg-green-50 px-2 py-1 rounded-md text-green-700"
                            >
                              {group}: {count as number}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </a>
          ))}
        </div>

        {/* Sentinel element — triggers next page load when scrolled into view */}
        <div ref={sentinelRef} className="h-4" />

        {/* Loading spinner for subsequent pages */}
        {loading && !initialLoading && (
          <div className="text-center py-6 text-gray-500">Loading more...</div>
        )}

        {/* End-of-list message */}
        {!hasMore && quests.length > 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">
            All {quests.length} quest{quests.length !== 1 ? 's' : ''} loaded
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f9ec] flex flex-col">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#f6f9ec',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Header */}
      <Header menuColor="text-green-500" logoSrc="/logo/bitz_green.svg" />

      {/* Main content */}
      <div className="flex-grow container mx-auto px-4 py-6">
        {renderTabs()}
        {renderQuestList()}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
