import { useEffect, useState } from 'react';
import useAdminStore from '@store/adminStore';
import useReminderStore from '@store/reminderStore';
import { Card, CardContent, CardHeader, CardTitle } from '@components/shared/Card';
import Button from '@components/shared/Button';
import SearchBar from '@components/admin/SearchBar';
import TableFilters from '@components/admin/TableFilters';
import SignupsTable from '@components/admin/SignupsTable';
import Pagination from '@components/admin/Pagination';
import ReminderDetailModal from '@components/admin/ReminderDetailModal';
import Spinner from '@components/shared/Spinner';
import Alert, { AlertDescription } from '@components/shared/Alert';
import { Download, RefreshCw, Users, Clock } from 'lucide-react';
import { exportSignupsToCSV, generateExportFilename } from '@utils/csvExport';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const {
    allSignups,
    isLoading,
    loadError,
    currentPage,
    pageSize,
    filters,
    searchQuery,
    sortConfig,
    selectedSignupIds,
    fetchAllSignups,
    refreshData,
    setCurrentPage,
    setPageSize,
    setFilter,
    setSearchQuery,
    toggleSortDirection,
    toggleSignupSelection,
    selectAllSignups,
    clearSelection,
    clearFilters,
    getPaginatedSignups,
    getTotalPages,
    getTotalCount,
    getActiveFiltersCount,
    getFilteredAndSearchedSignups,
  } = useAdminStore();

  const { sendReminderAsync, sendingReminders } = useReminderStore();

  // Modal state
  const [selectedSignup, setSelectedSignup] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchAllSignups();
  }, []);

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleExportAll = () => {
    const filename = generateExportFilename({});
    exportSignupsToCSV(allSignups, filename);
  };

  const handleExportFiltered = () => {
    const filteredData = getFilteredAndSearchedSignups();
    const filename = generateExportFilename(filters);
    exportSignupsToCSV(filteredData, filename);
  };

  const handleFilterChange = (filterKey, value) => {
    setFilter(filterKey, value);
  };

  const handleSendReminder = async (signupId) => {
    try {
      await sendReminderAsync(signupId);
      toast.success('Reminder sent successfully');
      await refreshData();
    } catch (error) {
      toast.error(`Failed to send reminder: ${error.message}`);
    }
  };

  const handleViewDetails = (signup) => {
    setSelectedSignup(signup);
    setIsDetailModalOpen(true);
  };

  const paginatedSignups = getPaginatedSignups();
  const totalPages = getTotalPages();
  const totalCount = getTotalCount();
  const activeFiltersCount = getActiveFiltersCount();
  const pendingCount = allSignups.filter((s) => s.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Student Signups
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage training registrations and send reminders
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allSignups.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reminders</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeFiltersCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="space-y-4">
              {/* Search and Export */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 sm:max-w-sm">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery('')}
                    placeholder="Search by email, phone, or training type..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportFiltered}
                    disabled={totalCount === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Filtered ({totalCount})
                  </Button>
                  <Button variant="outline" onClick={handleExportAll} disabled={allSignups.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All ({allSignups.length})
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <TableFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                activeFiltersCount={activeFiltersCount}
              />
            </div>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            )}

            {/* Table */}
            {!isLoading && (
              <>
                <SignupsTable
                  signups={paginatedSignups}
                  sortConfig={sortConfig}
                  onSort={toggleSortDirection}
                  onSelectSignup={toggleSignupSelection}
                  selectedSignupIds={selectedSignupIds}
                  onSendReminder={handleSendReminder}
                  onViewDetails={handleViewDetails}
                  sendingReminders={sendingReminders}
                />

                {/* Pagination */}
                {totalCount > 0 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      totalCount={totalCount}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reminder Detail Modal */}
      <ReminderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        signup={selectedSignup}
        onRefresh={refreshData}
      />
    </div>
  );
};

export default AdminDashboard;
