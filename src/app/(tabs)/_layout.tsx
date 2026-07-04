import { Tabs, useRouter } from 'expo-router';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';

/** Botão central "+" — só o ícone (sem caixa), na cor de destaque. */
function PlusButton() {
  return <Icon name="plus" set="bold" size={30} color={colors.accent[500]} />;
}

export default function TabsLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: colors.ink[500],
        tabBarStyle: { backgroundColor: colors.surface.white, borderTopColor: colors.surface.border },
      }}
    >
      <Tabs.Screen name="feed" options={{ tabBarIcon: ({ color, focused }) => <Icon name="home" size={26} color={color} set={focused ? 'bold' : 'light'} /> }} />
      <Tabs.Screen name="groups" options={{ tabBarIcon: ({ color, focused }) => <Icon name="groups" size={26} color={color} set={focused ? 'bold' : 'light'} /> }} />
      <Tabs.Screen name="opportunities" options={{ tabBarIcon: ({ color, focused }) => <Icon name="work" size={26} color={color} set={focused ? 'bold' : 'light'} /> }} />

      {/* + central: não navega, abre o modal de compose */}
      <Tabs.Screen
        name="create"
        options={{ tabBarIcon: () => <PlusButton /> }}
        listeners={{ tabPress: (e) => { e.preventDefault(); router.push('/compose'); } }}
      />

      <Tabs.Screen name="messages" options={{ tabBarIcon: ({ color, focused }) => <Icon name="chat" size={26} color={color} set={focused ? 'bold' : 'light'} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ color, focused }) => <Icon name="user" size={26} color={color} set={focused ? 'bold' : 'light'} /> }} />
    </Tabs>
  );
}
