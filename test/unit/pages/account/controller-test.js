'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';
import AccountController from 'pages/account/controller.js';
chai.use(sinonChai);

import { shell } from 'electron';

describe('Login controller', function(){

  let controller;

  describe('initial state', function() {

    beforeEach(function() {
      controller = new AccountController();
    });

    it('should not be failed', function() {
      expect(controller.authFailed).to.be.defined;
      expect(controller.authFailed).to.be.false;
    });

    it('username should be empty', function() {
      expect(controller.username).to.be.defined;
      expect(controller.username).to.be.empty;
    });

    it('password should be empty', function() {
      expect(controller.password).to.be.defined;
      expect(controller.password).to.be.empty;
    });

    it('terms and conditions should be considered signed', function() {
      expect(controller.tandcNotSigned).to.be.defined;
      expect(controller.tandcNotSigned).to.be.false;
    });
  });

  describe('login', function() {

    let http, base64;

    beforeEach(function() {
      base64 = { encode: function() {}};
    });

    it('should make an HTTP request', function(){
      http = sinon.stub().resolves('success');

      controller = new AccountController({}, http, base64);
      controller.login();

      expect(http).to.have.been.calledOnce;
    });

    it('should make a GET request with correct username and password', function(){
      http = sinon.stub().resolves('success');
      base64 = { encode: function(input) { return input }};

      let req = {
        method: 'GET',
        url: 'https://developers.redhat.com/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.0.0-beta3.zip',
        headers: {
          'Authorization': 'Basic username:password'
        }
      }

      controller = new AccountController({}, http, base64);
      controller.username = 'username';
      controller.password = 'password';
      controller.login();

      expect(http).to.have.been.calledWith(req);
      expect(http).to.have.been.calledOnce;
    });

    it('should call handleHttpFailure on HTTP failure', function(){
      http = function() { return Promise.reject('serious error')};
      controller = new AccountController({}, http, base64);
      let spy = sinon.spy(controller, 'handleHttpFailure');

      controller.login();

      return http().then(function() {
        expect.fail();
      }).catch(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith('serious error');
      });
    });

    it('should call handleHttpSuccess on successful HTTP request', function(){
      http = function() { return Promise.resolve({ status: 404 })};
      controller = new AccountController({}, http, base64);
      let spy = sinon.spy(controller, 'handleHttpSuccess');

      controller.login();

      return http().then(function() {
        expect.fail();
      }).catch(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith({ status: 404 });
      });
    });
  });

  describe('handleHttpFailure', function() {
    it('should set authFailed after failure', function(){
      controller = new AccountController();
      controller.handleHttpFailure('some error');

      expect(controller.authFailed).to.be.true;
      expect(controller.tandcNotSigned).to.be.false;
    });
  });

  describe('handleHttpSuccess', function() {
    it('should set authFailed when return code of HTTP request is not 200', function(){
      controller = new AccountController();
      controller.handleHttpSuccess({ status: 404 });

      expect(controller.authFailed).to.be.true;
      expect(controller.tandcNotSigned).to.be.false;
    });

    it('should set tandcNotSigned when no data returned', function(){
      controller = new AccountController({});
      controller.handleHttpSuccess({ status: 200, data: false });

      expect(controller.authFailed).to.be.false;
      expect(controller.tandcNotSigned).to.be.true;
    });

    it('should go to the page "confirm" when everything is OK', function(){
      let router = { go: function() {} };
      let spy = sinon.spy(router, 'go');
      let installerDataSvc = { setCredentials: function() {} };

      controller = new AccountController(router, null, null, installerDataSvc);
      controller.handleHttpSuccess({ status: 200, data: true });

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('confirm');
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.authFailed).to.be.false;
    });

    it('should save credentials for later use when everything is OK', function(){
      let router = { go: function() {} };
      let installerDataSvc = { setCredentials: function() {} };
      let spy = sinon.spy(installerDataSvc, 'setCredentials');

      controller = new AccountController(router, null, null, installerDataSvc);
      controller.username = 'Frank';
      controller.password = 'p@ssw0rd';
      controller.handleHttpSuccess({ status: 200, data: true });

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Frank', 'p@ssw0rd');
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.authFailed).to.be.false;
    });
  });
})
