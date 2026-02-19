import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { sidebarStore } from '~/lib/stores/sidebar';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);
  const sidebarOpen = useStore(sidebarStore.open);

  return (
    <header
      className={classNames('flex items-center px-5 border-b h-[var(--header-height)] bg-transparent', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-3 z-logo text-bolt-elements-textPrimary cursor-pointer">
        {!sidebarOpen && (
          <button
            type="button"
            aria-label="Open sidebar"
            className="i-ph:sidebar-simple text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors bg-transparent border-none p-0"
            onClick={() => sidebarStore.toggle()}
          />
        )}
      </div>
      {chat.started && (
        <>
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textSecondary text-sm">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
