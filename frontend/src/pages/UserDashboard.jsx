import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublicAuth } from '../context/PublicAuthContext';
import publicApi from '../lib/publicApi';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

import {
  AlertTriangle,
  Heart,
  Trophy,
  Droplet,
  Calendar,
  Building2,
  Shield,
  Flame,
  Star,
  Gift,
  MapPin
} from 'lucide-react';

export const UserDashboard = () => {
  const { user, logout } = usePublicAuth();
  const [profile, setProfile] = useState(null);
  const [donorStats, setDonorStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await publicApi.get('/public-auth/me');
        setProfile(res.data.user);
      } catch {
        // ignore for now
      }
    };
    const fetchDonorStats = async () => {
      try {
        const res = await publicApi.get('/donor-profile/dashboard');
        setDonorStats(res.data.data);
      } catch {
        // ignore — may not have any donations
      }
    };
    const fetchLeaderboard = async () => {
      try {
        const res = await publicApi.get('/donor-profile/leaderboard');
        setLeaderboard(res.data.data);
      } catch {
      }
    };
    fetchMe();
    fetchDonorStats();
    fetchLeaderboard();
  }, []);

  const displayName = profile?.firstName || user?.firstName;
  const stats = donorStats?.stats;
  const eligibility = donorStats?.eligibility;
  const badges = donorStats?.badges;
  const earnedBadges = badges?.filter((b) => b.earned) || [];
  const currentTier = [...(earnedBadges || [])].pop();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome, {displayName}</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
              This is your personal blood donation & request hub.
            </p>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        {/* ===== Donation Stats Teaser ===== */}
        {stats && (
          <Link to="/user/donor-dashboard" className="block">
            <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-800 rounded-xl p-5 text-white hover:shadow-lg transition-all duration-200 hover:scale-[1.01]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  <span className="font-semibold text-sm">Your Donation Journey</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  Tap for full dashboard →
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <Droplet className="w-5 h-5 mx-auto mb-1 text-red-200" />
                  <p className="text-2xl font-bold">{stats.totalDonations}</p>
                  <p className="text-[10px] text-red-200">Donations</p>
                </div>
                <div className="text-center">
                  <Heart className="w-5 h-5 mx-auto mb-1 text-red-200" />
                  <p className="text-2xl font-bold">{stats.livesSaved}</p>
                  <p className="text-[10px] text-red-200">Lives Saved</p>
                </div>
                <div className="text-center">
                  <Flame className="w-5 h-5 mx-auto mb-1 text-orange-300" />
                  <p className="text-2xl font-bold">{stats.streak}</p>
                  <p className="text-[10px] text-red-200">Streak</p>
                </div>
                <div className="text-center">
                  <Star className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
                  <p className="text-2xl font-bold">{stats.rewardPoints}</p>
                  <p className="text-[10px] text-red-200">Points</p>
                </div>
              </div>
              {/* Current badge */}
              {currentTier && (
                <div className="flex items-center gap-2 mt-3 bg-white/10 rounded-lg px-3 py-1.5">
                  <span className="text-lg">{currentTier.emoji}</span>
                  <span className="text-xs font-medium">{currentTier.name}</span>
                </div>
              )}
            </div>
          </Link>
        )}

        {/* ===== Eligibility Quick Status ===== */}
        {eligibility && (
          <Link to="/user/donor-dashboard" className="block">
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md ${eligibility.isEligible
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                }`}
            >
              <Shield
                className={`w-8 h-8 ${eligibility.isEligible ? 'text-green-600' : 'text-amber-600'
                  }`}
              />
              <div className="flex-1">
                <p
                  className={`text-sm font-bold ${eligibility.isEligible
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-amber-800 dark:text-amber-300'
                    }`}
                >
                  {eligibility.isEligible ? '✅ Eligible to Donate' : '⏳ Not Yet Eligible'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {eligibility.passedChecks}/{eligibility.totalChecks} checks passed
                  {!eligibility.isEligible && ' — tap for details'}
                </p>
              </div>
              <Gift
                className={`w-5 h-5 ${eligibility.isEligible ? 'text-green-400' : 'text-amber-400'
                  }`}
              />
            </div>
          </Link>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <p>{profile?.email}</p>
              <p>{profile?.phone}</p>
              <p>
                Blood Group:{' '}
                <span className="font-semibold">{profile?.bloodGroup || 'Not set'}</span>
              </p>
              <p>
                Location:{' '}
                <span className="font-semibold">
                  {profile?.city || '-'} {profile?.pinCode ? `(${profile.pinCode})` : ''}
                </span>
              </p>
              <Link
                to="/user/profile"
                className="text-primary-600 dark:text-primary-400 text-xs font-medium inline-block mt-2"
              >
                Edit profile
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Rewards & Badges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <p>
                Reward Points:{' '}
                <span className="font-semibold">{profile?.rewardPoints ?? 0}</span>
              </p>
              {earnedBadges.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {earnedBadges.slice(0, 4).map((b) => (
                    <span
                      key={b.id}
                      className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs font-semibold"
                      title={b.description}
                    >
                      {b.emoji} {b.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Donate to earn your first badge! 🥉
                </p>
              )}
              <Link
                to="/user/donor-dashboard"
                className="text-amber-600 dark:text-amber-400 text-xs font-medium inline-block mt-1 hover:underline"
              >
                View all badges →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link to="/user/emergency">
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white" variant="primary">
                  <AlertTriangle className="w-4 h-4" />
                  Emergency Blood Request
                </Button>
              </Link>
              <Link to="/live-map">
                <Button className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white shadow-lg animation-pulse" variant="primary">
                  <MapPin className="w-4 h-4" />
                  Live Blood Demand Map
                </Button>
              </Link>
              <Link to="/user/donor-dashboard">
                <Button className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white" variant="primary">
                  <Heart className="w-4 h-4" />
                  Donation Dashboard
                </Button>
              </Link>
              <Link to="/user/request-blood">
                <Button className="w-full" variant="primary">
                  Request Blood
                </Button>
              </Link>
              <Link to="/user/appointments">
                <Button className="w-full" variant="outline">
                  My Appointments
                </Button>
              </Link>
              <Link to="/user/camps">
                <Button className="w-full" variant="outline">
                  Nearby Camps
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ===== Leaderboard Section ===== */}
        {leaderboard.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Donors This Month</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {leaderboard.map((donor, idx) => (
                  <div key={donor.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-750/50 transition-colors">
                    <div className="w-8 flex-shrink-0 text-center">
                      {idx === 0 ? <span className="text-2xl" title="1st Place">🥇</span> :
                        idx === 1 ? <span className="text-2xl" title="2nd Place">🥈</span> :
                          idx === 2 ? <span className="text-2xl" title="3rd Place">🥉</span> :
                            <span className="text-lg font-bold text-gray-400 dark:text-gray-500">#{donor.rank}</span>}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {donor.name}
                        {user?._id === donor.id && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-wider">You</span>}
                        <span title="Top Badge">{donor.topBadge}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Blood Group: <strong>{donor.bloodGroup || 'Unknown'}</strong></p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600 dark:text-amber-400 text-lg">{donor.points} <span className="text-xs font-normal">pts</span></p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">{donor.badges} Badges</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
