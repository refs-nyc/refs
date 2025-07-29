import { decode as atob, encode as btoa } from 'base-64'

global.atob = atob
global.btoa = btoa
