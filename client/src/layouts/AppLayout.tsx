import { useState } from 'react'
import { Badge, Button, Drawer, Dropdown, Layout, Tooltip } from 'antd'
import {
  AppstoreOutlined,
  BarChartOutlined,
  GlobalOutlined,
  HomeOutlined,
  LogoutOutlined,
  MailOutlined,
  MenuOutlined,
  MoonOutlined,
  ProfileOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SunOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { homeFor, useAuth } from '../auth/useAuth'
import { usePrefs } from '../prefs/usePrefs'
import { useCart } from '../cart/useCart'
import { Logo } from '../components/Logo'

const { Header, Content, Footer } = Layout
const YEAR = new Date().getFullYear()

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean }

export function AppLayout() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const { t } = useTranslation()
  const { lang, setLang, dark, setDark } = usePrefs()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isCustomer = !user || user.type === 'user'
  const nav: NavItem[] =
    user?.type === 'restaurant'
      ? [
          { to: '/restaurant', label: t('nav.dashboard'), icon: <BarChartOutlined />, end: true },
          { to: '/restaurant/orders', label: t('nav.liveOrders'), icon: <UnorderedListOutlined /> },
          { to: '/restaurant/menu', label: t('nav.menu'), icon: <AppstoreOutlined /> },
          { to: '/restaurant/settings', label: t('nav.settings'), icon: <SettingOutlined /> },
        ]
      : user?.type === 'admin'
        ? [
            { to: '/admin/restaurants', label: t('nav.restaurants'), icon: <ShopOutlined /> },
            { to: '/admin/cities', label: t('nav.cities'), icon: <GlobalOutlined /> },
            { to: '/admin/messages', label: t('nav.messages'), icon: <MailOutlined /> },
          ]
        : [
            { to: '/', label: t('nav.home'), icon: <HomeOutlined />, end: true },
            ...(user ? [{ to: '/orders', label: t('nav.orders'), icon: <ProfileOutlined /> }] : []),
          ]

  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar')
  const darkLabel = dark ? t('nav.lightMode') : t('nav.darkMode')

  function onLogout() {
    setDrawerOpen(false)
    logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold no-underline transition ${
      isActive ? 'bg-coal text-white dark:bg-white dark:text-coal' : 'text-ink hover:bg-line'
    }`

  return (
    <Layout className="min-h-screen">
      <Header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line !px-4 backdrop-blur sm:!px-6" style={{ background: 'color-mix(in srgb, var(--card) 88%, transparent)' }}>
        <Link to={homeFor(user)} className="flex shrink-0 items-center no-underline" aria-label={t('brand.name')}>
          <Logo size={34} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <Button type="text" icon={<GlobalOutlined />} onClick={toggleLang} className="!hidden sm:!inline-flex">
            {t('nav.switchLanguage')}
          </Button>
          <Tooltip title={darkLabel}>
            <Button type="text" shape="circle" aria-label={darkLabel} icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={() => setDark(!dark)} className="!hidden sm:!inline-flex" />
          </Tooltip>

          {isCustomer && (
            <Link to="/cart" aria-label={t('nav.cart')}>
              <Badge count={count} color="#E53935" offset={[-4, 4]}>
                <Button shape="circle" size="large" icon={<ShoppingCartOutlined />} />
              </Badge>
            </Link>
          )}

          {user ? (
            <Dropdown
              menu={{
                items: [
                  { key: 'email', label: user.email, disabled: true },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout'), onClick: onLogout },
                ],
              }}
            >
              <Button icon={<UserOutlined />} className="!hidden md:!inline-flex">
                {user.name.split(' ')[0]}
              </Button>
            </Dropdown>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button>{t('nav.login')}</Button>
              </Link>
              <Link to="/signup" className="hidden sm:block">
                <Button type="primary">{t('nav.signup')}</Button>
              </Link>
            </>
          )}

          <Button type="text" aria-label={t('nav.openMenu')} icon={<MenuOutlined />} className="md:!hidden" onClick={() => setDrawerOpen(true)} />
        </div>
      </Header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} placement={lang === 'ar' ? 'left' : 'right'} size={290} title={<Logo size={28} />}>
        {user && (
          <div className="mb-4 rounded-2xl bg-page p-3">
            <div className="font-bold">{user.name}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
        )}
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={() => setDrawerOpen(false)}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button icon={<GlobalOutlined />} onClick={toggleLang}>
            {t('nav.switchLanguage')}
          </Button>
          <Button icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={() => setDark(!dark)}>
            {darkLabel}
          </Button>
        </div>
        <div className="mt-3">
          {user ? (
            <Button block danger icon={<LogoutOutlined />} onClick={onLogout}>
              {t('nav.logout')}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link to="/login" onClick={() => setDrawerOpen(false)}>
                <Button block>{t('nav.login')}</Button>
              </Link>
              <Link to="/signup" onClick={() => setDrawerOpen(false)}>
                <Button block type="primary">
                  {t('nav.signup')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Drawer>

      <Content className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 md:pb-10">
        <Outlet />
      </Content>

      <Footer className="!bg-coal !px-0 !py-0 text-white/75 dark:!bg-black">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 pt-10 pb-6 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo size={34} inverted />
            <p className="mt-3 mb-0 max-w-xs text-sm leading-relaxed">{t('footer.about')}</p>
          </div>
          <div>
            <p className="mt-0 mb-3 text-sm font-bold text-white">{t('footer.explore')}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              {(isCustomer
                ? [
                    { to: '/', label: t('nav.home') },
                    { to: '/cart', label: t('nav.cart') },
                    { to: user ? '/orders' : '/login', label: t('nav.orders') },
                  ]
                : nav
              ).map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-white/75 no-underline hover:text-sun">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mt-0 mb-3 text-sm font-bold text-white">{t('footer.help')}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              <li>
                <Link to="/contact" className="text-white/75 no-underline hover:text-sun">
                  {t('footer.contact')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-white/75 no-underline hover:text-sun">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white/75 no-underline hover:text-sun">
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-4 pb-20 text-center text-xs md:pb-4">{t('footer.rights', { year: YEAR })}</div>
      </Footer>

      {isCustomer && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-card md:hidden">
          {[
            { to: '/', label: t('nav.home'), icon: <HomeOutlined />, end: true },
            { to: '/cart', label: t('nav.cart'), icon: <ShoppingCartOutlined /> },
            { to: user ? '/orders' : '/login', label: t('nav.orders'), icon: <ProfileOutlined /> },
          ].map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] no-underline ${isActive ? 'text-brand' : 'text-muted'}`}
            >
              <span className="text-xl">{item.to === '/cart' ? <Badge count={count} size="small" color="#E53935">{item.icon}</Badge> : item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </Layout>
  )
}
