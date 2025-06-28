/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GaxiosError } from 'gaxios';
import { useState, useEffect, useCallback } from 'react';
import { Config, CodeAssistServer, UserTierId } from '@google/gemini-cli-core';

export interface PrivacyState {
  isLoading: boolean;
  error?: string;
  isFreeTier?: boolean;
  dataCollectionOptIn?: boolean;
}

export const usePrivacySettings = (config: Config) => {
  const [privacyState, setPrivacyState] = useState<PrivacyState>({
    isLoading: true,
  });

  useEffect(() => {
    const fetchInitialState = async () => {
      setPrivacyState({
        isLoading: true,
      });
      try {
        const server = getCodeAssistServer(config);
        const tier = await getTier(server);
        if (tier !== UserTierId.FREE) {
          // We don't need to fetch opt-out info since non-free tier
          // data gathering is already worked out some other way.
          setPrivacyState({
            isLoading: false,
            isFreeTier: false,
          });
          return;
        }

        const optIn = await getRemoteDataCollectionOptIn(server);
        setPrivacyState({
          isLoading: false,
          isFreeTier: true,
          dataCollectionOptIn: optIn,
        });
      } catch (e) {
        setPrivacyState({
          isLoading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    };
    fetchInitialState();
  }, [config]);

  const updateDataCollectionOptIn = useCallback(
    async (optIn: boolean) => {
      try {
        const server = getCodeAssistServer(config);
        const updatedOptIn = await setRemoteDataCollectionOptIn(server, optIn);
        setPrivacyState({
          isLoading: false,
          isFreeTier: true,
          dataCollectionOptIn: updatedOptIn,
        });
      } catch (e) {
        setPrivacyState({
          isLoading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [config],
  );

  return {
    privacyState,
    updateDataCollectionOptIn,
  };
};

/**
 * Retrieves a `CodeAssistServer` instance from the provided configuration.
 *
 * @param config - The configuration object containing the Gemini client
 * @returns The `CodeAssistServer` instance associated with the current project
 * @throws If OAuth is not enabled or the server lacks a project ID
 */
function getCodeAssistServer(config: Config): CodeAssistServer {
  const server = config.getGeminiClient().getContentGenerator();
  // Neither of these cases should ever happen.
  if (!(server instanceof CodeAssistServer)) {
    throw new Error('Oauth not being used');
  } else if (!server.projectId) {
    throw new Error('Oauth not being used');
  }
  return server;
}

/**
 * Retrieves the user's current tier ID from the CodeAssist server.
 *
 * @returns The ID of the user's current tier.
 * @throws If the user does not have a current tier.
 */
async function getTier(server: CodeAssistServer): Promise<UserTierId> {
  const loadRes = await server.loadCodeAssist({
    cloudaicompanionProject: server.projectId,
    metadata: {
      ideType: 'IDE_UNSPECIFIED',
      platform: 'PLATFORM_UNSPECIFIED',
      pluginType: 'GEMINI',
      duetProject: server.projectId,
    },
  });
  if (!loadRes.currentTier) {
    throw new Error('User does not have a current tier');
  }
  return loadRes.currentTier.id;
}

/**
 * Retrieves the user's data collection opt-in status from the server.
 *
 * If no opt-in setting is found (404 error), returns `true` as the default value. Propagates other errors.
 *
 * @returns The current data collection opt-in status.
 */
async function getRemoteDataCollectionOptIn(
  server: CodeAssistServer,
): Promise<boolean> {
  try {
    const resp = await server.getCodeAssistGlobalUserSetting();
    return resp.freeTierDataCollectionOptin;
  } catch (e) {
    if (e instanceof GaxiosError) {
      if (e.response?.status === 404) {
        return true;
      }
    }
    throw e;
  }
}

/**
 * Updates the user's data collection opt-in setting on the remote server.
 *
 * @param optIn - The new opt-in value to set for data collection
 * @returns The updated opt-in value as confirmed by the server
 */
async function setRemoteDataCollectionOptIn(
  server: CodeAssistServer,
  optIn: boolean,
): Promise<boolean> {
  const resp = await server.setCodeAssistGlobalUserSetting({
    cloudaicompanionProject: server.projectId,
    freeTierDataCollectionOptin: optIn,
  });
  return resp.freeTierDataCollectionOptin;
}
