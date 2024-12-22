import { Block } from '@/chat/schemas/block.schema';
import { Context } from '@/chat/schemas/types/context';
import {
  OutgoingMessageFormat,
  StdOutgoingEnvelope,
  StdOutgoingTextEnvelope,
} from '@/chat/schemas/types/message';
import { BlockService } from '@/chat/services/block.service';
import { BaseBlockPlugin } from '@/plugins/base-block-plugin';
import { PluginService } from '@/plugins/plugins.service';
import { PluginBlockTemplate } from '@/plugins/types';
import { SettingService } from '@/setting/services/setting.service';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import SETTINGS from './settings';

@Injectable()
export class GPSPlugin extends BaseBlockPlugin<typeof SETTINGS> {
  template: PluginBlockTemplate = {
    patterns: ['gps'],
    starts_conversation: true,
    name: 'GPS Locator Plugin',
  };

  constructor(
    pluginService: PluginService,
    private readonly blockService: BlockService,
    private readonly settingService: SettingService,
  ) {
    super('gps-plugin', pluginService);
  }

  getPath(): string {
    return __dirname;
  }

  async process(
    block: Block,
    context: Context,
    _convId: string,
  ): Promise<StdOutgoingEnvelope> {
    const settings = await this.settingService.getSettings();
    const args = this.getArguments(block);

    try {
      // Fetch GPS data
      const { latitude, longitude } = await this.getGPSData();

      // Fetch address using reverse geocoding
      const address = await this.getAddressFromCoordinates(latitude, longitude);

      const response: string =
        this.blockService.getRandom([...args.response_message]) +
        ` 🏠 Address: ${address}`;

      const msg: StdOutgoingTextEnvelope = {
        format: OutgoingMessageFormat.text,
        message: {
          text: this.blockService.processText(response, context, {}, settings),
        },
      };

      return msg;
    } catch (error) {
      const errorMessage: string = this.blockService.getRandom([
        ...args.error_message,
      ]);

      const errorMsg: StdOutgoingTextEnvelope = {
        format: OutgoingMessageFormat.text,
        message: {
          text: this.blockService.processText(
            errorMessage,
            context,
            {},
            settings,
          ),
        },
      };

      return errorMsg;
    }
  }

  private async getGPSData(): Promise<{ latitude: number; longitude: number }> {
    // Mock GPS data. Replace with actual geolocation API or service.
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => reject(new Error('GPS access denied')),
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  private async getAddressFromCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<string> {
    const apiKey = 'YOUR_API_KEY'; // Replace with your reverse geocoding API key
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

    try {
      const response = await axios.get(url);
      if (response.data && response.data.results && response.data.results[0]) {
        return response.data.results[0].formatted_address;
      } else {
        throw new Error('No address found for the given coordinates.');
      }
    } catch (error) {
      console.error('Error fetching address:', error.message);
      throw new Error('Unable to fetch address from coordinates.');
    }
  }
}
