import { CONTRACT_ADDRESS } from '@dfdao/contracts';
import { address } from '@dfdao/serde';
import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import { Theme } from '../Components/Theme';
import { LandingPageBackground } from '../Renderers/LandingPageCanvas';
import dfstyles from '../Styles/dfstyles';
import { CreateLobby } from './CreateLobby';
import { EventsPage } from './EventsPage';
import { GameLandingPage } from './GameLandingPage';
import { GifMaker } from './GifMaker';
import LandingPage from './LandingPage';
import { NotFoundPage } from './NotFoundPage';
import { ShareArtifact } from './ShareArtifact';
import { SharePlanet } from './SharePlanet';
import { TestArtifactImages } from './TestArtifactImages';
import { TxConfirmPopup } from './TxConfirmPopup';
import UnsubscribePage from './UnsubscribePage';
import { ValhallaPage } from './ValhallaPage';

const defaultAddress = address(CONTRACT_ADDRESS);

function App() {
  return (
    <>
      <GlobalStyle />
      {/* Provides theming for WebComponents from the `@dfdao/ui` package */}
      <Theme color='dark' scale='medium'>
        <Router>
          <Switch>
            <Redirect path='/play' to={`/play/${defaultAddress}`} push={true} exact={true} />
            <Route path='/play/:contract' component={GameLandingPage} />
            <Route path='/events' component={EventsPage} />
            <Route path='/' exact component={LandingPage} />
            <Redirect path='/lobby' to={`/lobby/${defaultAddress}`} push={true} exact={true} />
            <Route path='/lobby/:contract' component={CreateLobby} />
            <Route path='/planet/:locationId' component={SharePlanet} />
            <Route path='/artifact/:artifactId' component={ShareArtifact} />
            <Route
              path='/wallet/:contract/:addr/:actionId/:balance/:method'
              component={TxConfirmPopup}
            />
            <Route path='/unsubscribe' component={UnsubscribePage} />
            <Route path='/valhalla' component={ValhallaPage} />
            {import.meta.env.DEV && <Route path='/images' component={TestArtifactImages} />}
            {import.meta.env.DEV && <Route path='/gifs' component={GifMaker} />}
            {import.meta.env.DEV && <Route path='/bg' component={LandingPageBackground} />}
            <Route path='*' component={NotFoundPage} />
          </Switch>
        </Router>
      </Theme>
    </>
  );
}

const GlobalStyle = createGlobalStyle`
body {
  width: 100vw;
  min-height: 100vh;
  background-color: ${dfstyles.colors.background};
}
`;

export default App;
