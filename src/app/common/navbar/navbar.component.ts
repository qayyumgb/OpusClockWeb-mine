<<<<<<< HEAD
import {Component} from '@angular/core';
import {AuthService} from '../services/auth.service';
import {Router} from '@angular/router';

=======
import { Component } from '@angular/core';
>>>>>>> mukhtar_branch

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
<<<<<<< HEAD
  constructor(private authService: AuthService,
              private router: Router) {
  }

  async signOut() {
    await this.authService.signOut();
    this.router.navigate(['auth']);
  }
=======
>>>>>>> mukhtar_branch

}
