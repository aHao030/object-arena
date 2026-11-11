import React from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import {themes, defaultThemeSlug} from '../../../astryx-themes';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Theme theme={themes[defaultThemeSlug]} mode="light"><App /></Theme></React.StrictMode>,
);
