import _ from 'lodash';
import { expect } from 'chai';
import Debug from 'debug';
import dotenv from 'dotenv';

dotenv.load({ silent: true });

const CRAFT_CFG = {
  owner: process.env.CRAFT_OWNER,
  project: process.env.CRAFT_PROJECT,
  token: process.env.CRAFT_TOKEN
};

Debug.enable(process.env.DEBUG);

global._ = _;
global.CRAFT_CFG = CRAFT_CFG;
global.debug = Debug('craft-ai:client:test');
global.expect = expect;
global.IN_BROWSER = false;
global.RUN_ID = process.env.TRAVIS_JOB_ID || 'local';
